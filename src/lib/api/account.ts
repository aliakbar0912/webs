/**
 * Typed wrappers around the CONFIRMED Devora API endpoints
 * (verified against adminserver/server/src/app.ts and module sources).
 *
 * Auth model: PocketBase owns identities; the API issues per-device tokens.
 * The website signs a user in by (1) exchanging email/password for a pbToken
 * at PocketBase, then (2) POST /v1/auth/session { pbToken, installId,
 * deviceName } which binds a web device and returns a device token. The
 * device token authenticates GET /v1/account, GET /v1/usage and the other
 * signed-in routes. It is held only inside the website's signed session
 * cookie and is never exposed to the browser.
 *
 * Every wrapper returns an honest discriminated result — none fabricates
 * success. The API has NO billing/subscription routes, so none exist here.
 */

import "server-only";
import { apiRequest, type ApiResult } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { serverEnv } from "@/lib/env";
import { siteConfig } from "@/lib/config/site";
import {
  PocketBaseError,
  authWithPassword,
  createUser,
  requestOtp,
  requestVerification,
} from "@/lib/api/pocketbase";
import {
  beginOAuth,
  finishOAuth,
  listOAuthProviders,
} from "@/lib/api/oauth";

// ---------------------------------------------------------------------------
// Shared error type used by the PocketBase-backed flows
// ---------------------------------------------------------------------------

export type UpstreamFailure = {
  code:
    | "not_configured"
    | "accounts_unavailable"
    | "network_error"
    | "timeout"
    | "upstream_error"
    | "invalid_response"
    | "pocketbase_error"
    | "provider_not_enabled"
    | "email_not_verified";
  message: string;
  status: number;
  /** Stable upstream error code when the API provided one. */
  upstreamCode?: string;
  fieldErrors?: Record<string, string>;
};

export type FlowResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: UpstreamFailure };

function fromApiError(result: { ok: false; error: { code: string; message: string; upstreamStatus?: number; upstreamCode?: string } }): UpstreamFailure {
  const code = result.error.code as UpstreamFailure["code"];
  const status = result.error.upstreamStatus ?? 502;
  if (code === "not_configured") {
    return {
      code: "not_configured",
      status: 503,
      message:
        "The Devora API is not connected to this website yet (missing server configuration).",
    };
  }
  if (code === "upstream_error" && result.error.upstreamCode === "accounts_not_configured") {
    return {
      code: "accounts_unavailable",
      status: 503,
      message: "Accounts are not set up on this Devora server yet.",
      upstreamCode: result.error.upstreamCode,
    };
  }
  if (code === "upstream_error" && result.error.upstreamCode === "invalid_api_key") {
    return {
      code: "not_configured",
      status: 503,
      message:
        "The website's API key is not configured, so the Devora API refuses requests. An administrator must set DEVORA_SERVER_API_KEY.",
      upstreamCode: result.error.upstreamCode,
    };
  }
  return {
    code,
    status,
    message: result.error.message,
    upstreamCode: result.error.upstreamCode,
  };
}

// ---------------------------------------------------------------------------
// Auth config — GET /v1/auth/config
// ---------------------------------------------------------------------------

export interface AuthConfig {
  enabled: boolean;
  available: boolean;
  loginRequired: boolean;
  pocketbaseUrl: string | null;
  usersCollection: string | null;
  providers: { name: string; displayName: string }[];
}

export async function fetchAuthConfig(): Promise<ApiResult<AuthConfig>> {
  return apiRequest<AuthConfig>(endpoints.authConfig(), { timeoutMs: 8_000 });
}

// ---------------------------------------------------------------------------
// Sign-in — PocketBase auth-with-password -> POST /v1/auth/session
// ---------------------------------------------------------------------------

export interface DevoraSession {
  deviceId: string;
  token: string;
  tokenExpiresAt: string;
  claimed: "new" | "same_user" | "legacy" | "switched";
  user: { id: string; email: string; name: string; verified: boolean };
}

/**
 * Exchange a PocketBase token for a Devora device token bound to this
 * browser. Shared by the password flow and the OAuth flow — step 3 of both.
 */
export async function exchangePbTokenForSession(input: {
  pbToken: string;
  installId: string;
  deviceName: string;
}): Promise<FlowResult<DevoraSession>> {
  const result = await apiRequest<DevoraSession>(endpoints.authSession(), {
    method: "POST",
    body: {
      pbToken: input.pbToken,
      installId: input.installId,
      deviceName: input.deviceName,
    },
    timeoutMs: 12_000,
  });
  if (!result.ok) return { ok: false, failure: fromApiError(result) };

  const data = result.data;
  if (
    typeof data?.token !== "string" ||
    typeof data?.deviceId !== "string" ||
    typeof data?.user?.email !== "string"
  ) {
    return {
      ok: false,
      failure: {
        code: "invalid_response",
        status: 502,
        message: "The sign-in response was not in the expected shape.",
      },
    };
  }
  return { ok: true, data };
}

/**
 * Signs a user in: PocketBase email/password first, then the API's session
 * route which binds the web device and issues the device token.
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  installId: string;
  deviceName: string;
}): Promise<FlowResult<DevoraSession>> {
  // 1. Auth config: accounts must be enabled and give us the PB coordinates.
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return {
      ok: false,
      failure: {
        code: "accounts_unavailable",
        status: 503,
        message: "Accounts are not set up on this Devora server yet.",
      },
    };
  }

  // 2. PocketBase sign-in (server-side; the pbToken never leaves the server).
  let pbToken: string;
  try {
    const pb = await authWithPassword(
      config.data.pocketbaseUrl,
      config.data.usersCollection,
      input.email,
      input.password
    );
    pbToken = pb.token;
  } catch (e) {
    if (e instanceof PocketBaseError) {
      return {
        ok: false,
        failure: {
          code: e.status === 0 ? "accounts_unavailable" : "upstream_error",
          status: e.status === 0 ? 503 : e.status,
          message: e.message,
          fieldErrors: e.fieldErrors,
        },
      };
    }
    throw e;
  }

  // 3. Exchange the pbToken for a Devora device token bound to this browser.
  return exchangePbTokenForSession({
    pbToken,
    installId: input.installId,
    deviceName: input.deviceName,
  });
}

/**
 * Resolves the website's own OAuth callback URL — the redirect_uri the
 * provider must be given. In production the canonical site URL is
 * authoritative (the same build-time constant the metadata/OG tags use);
 * the request origin is the development fallback.
 */
export function oauthRedirectUrl(requestOrigin: string): string | null {
  const base = serverEnv.isProduction() ? siteConfig.url : requestOrigin;
  try {
    const u = new URL(base);
    if (serverEnv.isProduction() && u.protocol !== "https:") return null;
    u.pathname = "/api/auth/oauth/callback";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Registration — PocketBase record creation (the API has no register route)
// ---------------------------------------------------------------------------

export async function registerWithPassword(input: {
  email: string;
  password: string;
}): Promise<FlowResult<{ verificationEmailSent: boolean }>> {
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return {
      ok: false,
      failure: {
        code: "accounts_unavailable",
        status: 503,
        message: "Accounts are not set up on this Devora server yet.",
      },
    };
  }
  const { pocketbaseUrl, usersCollection } = config.data;
  try {
    await createUser(pocketbaseUrl, usersCollection, {
      email: input.email,
      password: input.password,
    });
    await requestVerification(pocketbaseUrl, usersCollection, input.email);
    return { ok: true, data: { verificationEmailSent: true } };
  } catch (e) {
    if (e instanceof PocketBaseError) {
      return {
        ok: false,
        failure: {
          code: e.status === 0 ? "accounts_unavailable" : "pocketbase_error",
          status: e.status === 0 ? 503 : e.status,
          message: e.message,
          fieldErrors: e.fieldErrors,
        },
      };
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// OAuth — PocketBase auth-methods / auth-with-oauth2 (Google, GitHub, …)
// ---------------------------------------------------------------------------

/** Provider names safe for the browser; null when OAuth2 is unavailable. */
export async function listWebsiteOAuthProviders(): Promise<
  FlowResult<{ providers: { name: string; displayName: string }[] }>
> {
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return { ok: true, data: { providers: [] } };
  }
  const providers = await listOAuthProviders(
    config.data.pocketbaseUrl,
    config.data.usersCollection
  );
  if (providers === null) return { ok: true, data: { providers: [] } };
  return { ok: true, data: { providers } };
}

/** Starts an OAuth sign-in: fetches a fresh challenge from PocketBase. */
export async function startOAuth(input: {
  provider: string;
  redirectUrl: string;
}): Promise<
  FlowResult<{
    authUrl: string;
    state: string;
    codeVerifier: string;
  }>
> {
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return {
      ok: false,
      failure: {
        code: "accounts_unavailable",
        status: 503,
        message: "Accounts are not set up on this Devora server yet.",
      },
    };
  }
  try {
    const started = await beginOAuth(
      config.data.pocketbaseUrl,
      config.data.usersCollection,
      input.provider
    );
    return {
      ok: true,
      data: {
        authUrl: started.authUrl,
        state: started.provider.state,
        codeVerifier: started.provider.codeVerifier,
      },
    };
  } catch (e) {
    if (e instanceof PocketBaseError) {
      return {
        ok: false,
        failure: {
          code: e.status === 0 ? "accounts_unavailable" : e.status === 404 ? "provider_not_enabled" : "upstream_error",
          status: e.status === 0 ? 503 : e.status,
          message: e.message,
        },
      };
    }
    throw e;
  }
}

/** Finishes an OAuth sign-in: code → pbToken → Devora device session. */
export async function completeOAuth(input: {
  provider: string;
  code: string;
  codeVerifier: string;
  redirectUrl: string;
  installId: string;
  deviceName: string;
}): Promise<FlowResult<DevoraSession>> {
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return {
      ok: false,
      failure: {
        code: "accounts_unavailable",
        status: 503,
        message: "Accounts are not set up on this Devora server yet.",
      },
    };
  }
  let pbToken: string;
  try {
    const finished = await finishOAuth({
      pocketbaseUrl: config.data.pocketbaseUrl,
      usersCollection: config.data.usersCollection,
      provider: input.provider,
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirectUrl: input.redirectUrl,
    });
    pbToken = finished.token;
    // The desktop refuses unverified logins; the website does the same.
    if (!finished.user.verified) {
      return {
        ok: false,
        failure: {
          code: "email_not_verified",
          status: 403,
          message:
            "This account's email is not verified yet. Verify it first (the link in your email), then sign in again.",
        },
      };
    }
  } catch (e) {
    if (e instanceof PocketBaseError) {
      return {
        ok: false,
        failure: {
          code: e.status === 0 ? "accounts_unavailable" : "upstream_error",
          status: e.status === 0 ? 503 : e.status,
          message: e.message,
        },
      };
    }
    throw e;
  }
  return exchangePbTokenForSession({
    pbToken,
    installId: input.installId,
    deviceName: input.deviceName,
  });
}

// ---------------------------------------------------------------------------
// Password reset — PB request-otp -> API /v1/auth/password-reset
// ---------------------------------------------------------------------------

export async function requestResetOtp(email: string): Promise<FlowResult<{ otpId: string }>> {
  const config = await fetchAuthConfig();
  if (!config.ok) return { ok: false, failure: fromApiError(config) };
  if (!config.data.enabled || !config.data.pocketbaseUrl || !config.data.usersCollection) {
    return {
      ok: false,
      failure: {
        code: "accounts_unavailable",
        status: 503,
        message: "Accounts are not set up on this Devora server yet.",
      },
    };
  }
  try {
    const { otpId } = await requestOtp(config.data.pocketbaseUrl, config.data.usersCollection, email);
    return { ok: true, data: { otpId } };
  } catch (e) {
    if (e instanceof PocketBaseError) {
      return {
        ok: false,
        failure: {
          code: e.status === 0 ? "accounts_unavailable" : "pocketbase_error",
          status: e.status === 0 ? 503 : e.status,
          message: e.message,
        },
      };
    }
    throw e;
  }
}

export async function resetPasswordWithOtp(input: {
  otpId: string;
  otpCode: string;
  password: string;
}): Promise<FlowResult<{ reset: true }>> {
  const result = await apiRequest<{ reset?: boolean }>(endpoints.passwordReset(), {
    method: "POST",
    body: { otpId: input.otpId, otpCode: input.otpCode, password: input.password },
    timeoutMs: 12_000,
  });
  if (!result.ok) return { ok: false, failure: fromApiError(result) };
  return { ok: true, data: { reset: true } };
}

// ---------------------------------------------------------------------------
// Signed-in account routes (Bearer device token)
// ---------------------------------------------------------------------------

export interface AccountDevices {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  appVersion: string | null;
  signedIn: boolean;
  current: boolean;
}

export interface AccountResponse {
  user: {
    id: string;
    email: string;
    name: string;
    verified: boolean;
    created: string;
    hasAvatar: boolean;
  };
  identities: { id: string; provider: string; created: string }[];
  tokenExpiresAt: string;
  devices: AccountDevices[];
}

export async function fetchAccount(userToken: string): Promise<ApiResult<AccountResponse>> {
  return apiRequest<AccountResponse>(endpoints.account(), {
    userToken,
    timeoutMs: 12_000,
  });
}

export async function signOutDevice(userToken: string, deviceId: string): Promise<ApiResult<{ id: string; signedIn: boolean }>> {
  return apiRequest<{ id: string; signedIn: boolean }>(endpoints.deviceSignOut(deviceId), {
    method: "POST",
    userToken,
    timeoutMs: 10_000,
  });
}

export interface DeviceUsage {
  days: number;
  models: {
    modelId: string;
    modelName: string;
    requests: number;
    ok: number;
    failed: number;
    promptTokens: number;
    completionTokens: number;
  }[];
}

export async function fetchDeviceUsage(userToken: string, days = 30): Promise<ApiResult<DeviceUsage>> {
  return apiRequest<DeviceUsage>(`${endpoints.usage()}?days=${encodeURIComponent(String(days))}`, {
    userToken,
    timeoutMs: 12_000,
  });
}

export async function devoraLogout(userToken: string): Promise<ApiResult<{ signedOut?: boolean }>> {
  return apiRequest<{ signedOut?: boolean }>(endpoints.authLogout(), {
    method: "POST",
    userToken,
    timeoutMs: 8_000,
  });
}

// ---------------------------------------------------------------------------
// Announcements — GET /v1/announcements (Bearer device token)
//
// The owner publishes these in the admin panel (org_announcements); the same
// feed the desktop apps show. The website surfaces them in the dashboard so
// owners have ONE place to publish notices for every Devora client.
// ---------------------------------------------------------------------------

export interface DevoraAnnouncement {
  slug: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  revision: number;
  updatedAt: string;
}

export interface AnnouncementsResponse {
  version: number;
  announcements: DevoraAnnouncement[];
}

export async function fetchAnnouncements(userToken: string): Promise<ApiResult<AnnouncementsResponse>> {
  const result = await apiRequest<AnnouncementsResponse>(endpoints.announcements(), {
    userToken,
    timeoutMs: 8_000,
  });
  if (result.ok && !Array.isArray(result.data?.announcements)) {
    return {
      ok: false,
      requestId: result.requestId,
      error: {
        code: "invalid_response",
        message: "Announcements endpoint returned an unexpected payload.",
        requestId: result.requestId,
      },
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public client config — GET /v1/client-config (server key only)
// ---------------------------------------------------------------------------

export interface ClientConfig {
  schema: number;
  instanceId: string;
  apiOrigin: string | null;
  apiVersions?: string[];
  desktop: {
    minVersion: string | null;
    latestVersion: string | null;
    downloadUrl: string | null;
  };
  statusMessage?: string;
  maintenance?: boolean;
}

export async function fetchClientConfig(): Promise<ApiResult<ClientConfig>> {
  return apiRequest<ClientConfig>(endpoints.clientConfig(), { timeoutMs: 8_000 });
}

// ---------------------------------------------------------------------------
// Health — GET /healthz (unchanged, keyless)
// ---------------------------------------------------------------------------

export interface UpstreamHealth {
  status: string;
}

export async function fetchUpstreamHealth(): Promise<ApiResult<UpstreamHealth>> {
  const result = await apiRequest<UpstreamHealth>("/healthz", {
    timeoutMs: 5_000,
  });
  if (result.ok && typeof result.data?.status !== "string") {
    return {
      ok: false,
      requestId: result.requestId,
      error: {
        code: "invalid_response",
        message: "Health endpoint returned an unexpected payload.",
        requestId: result.requestId,
      },
    };
  }
  return result;
}
