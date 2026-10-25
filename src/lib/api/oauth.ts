/**
 * Website-side OAuth2 sign-in (e.g. "Continue with Google").
 *
 * PocketBase owns Devora identities and holds each provider's client secret,
 * so the website can complete the whole OAuth dance directly with PocketBase —
 * the same calls the desktop app's sign-in browser performs:
 *
 *   1. GET  /api/collections/{users}/auth-methods
 *      → enabled providers, each with a fresh `state`, PKCE `codeVerifier`
 *        and an `authUrl` that ends with `redirect_uri=`.
 *   2. Send the browser to `authUrl + encodeURIComponent(redirectUrl)`.
 *   3. The provider redirects back with ?code&state.
 *   4. POST /api/collections/{users}/auth-with-oauth2
 *      { provider, code, codeVerifier, redirectURL } → { token, record }
 *
 * The pbToken is then exchanged for a Devora device token exactly like the
 * password flow does (POST /v1/auth/session) — see signInWithPbToken.
 *
 * Server-only. Provider secrets never appear here (PocketBase keeps them)
 * and the codeVerifier/code live at most minutes, inside a signed HttpOnly
 * handshake cookie (see lib/session/oauth-handshake.ts).
 */

import "server-only";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  PocketBaseError,
  type PbAuthResult,
} from "@/lib/api/pocketbase";

const TIMEOUT_MS = 10_000;

export interface OAuthProviderInfo {
  name: string;
  displayName: string;
}

interface PbRawProvider {
  name: string;
  displayName: string;
  authUrl: string;
  state: string;
  codeVerifier: string;
  codeChallengeMethod: string;
}

async function pbJson(
  base: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: any }> {
  let res: Response;
  const parsed = new URL(base);
  if (parsed.protocol !== "https:") {
    throw new PocketBaseError(0, "PocketBase URL must use https");
  }
  try {
    res = await fetch(parsed.origin + path, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new PocketBaseError(0, "the account service could not be reached");
  }
  const text = await res.text().catch(() => "");
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { status: res.status, body };
}

function normalizeProviders(body: any): PbRawProvider[] {
  const list = body?.oauth2?.enabled ? body.oauth2.providers : [];
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (p: any) =>
        p &&
        typeof p.name === "string" &&
        typeof p.authUrl === "string" &&
        typeof p.state === "string" &&
        typeof p.codeVerifier === "string" &&
        p.name.length > 0
    )
    .map((p: any) => ({
      name: p.name.slice(0, 40),
      displayName: String(p.displayName ?? p.name).slice(0, 60),
      authUrl: p.authUrl,
      state: p.state,
      codeVerifier: p.codeVerifier,
      codeChallengeMethod: String(p.codeChallengeMethod ?? ""),
    }));
}

/**
 * Lists the OAuth providers enabled on the users collection — names only,
 * safe for the browser. Returns null when accounts/OAuth2 are not available
 * (the UI then shows no provider buttons and no error).
 */
export async function listOAuthProviders(
  pocketbaseUrl: string,
  usersCollection: string
): Promise<OAuthProviderInfo[] | null> {
  try {
    const col = encodeURIComponent(usersCollection);
    const { status, body } = await pbJson(
      pocketbaseUrl,
      `/api/collections/${col}/auth-methods`
    );
    if (status !== 200) return null;
    return normalizeProviders(body).map((p) => ({
      name: p.name,
      displayName: p.displayName,
    }));
  } catch (e) {
    logger.warn("auth", "OAuth provider list unavailable", {
      reason: e instanceof PocketBaseError ? "unreachable" : "error",
    });
    return null;
  }
}

export interface OAuthStartData {
  /** Full provider URL including state/challenge — append the encoded redirect URL. */
  authUrl: string;
  provider: OAuthProviderInfo & {
    state: string;
    codeVerifier: string;
    codeChallengeMethod: string;
  };
}

/**
 * Fetches a fresh provider challenge from PocketBase. Throws honest
 * PocketBaseErrors; the caller turns them into redirect error codes.
 */
export async function beginOAuth(
  pocketbaseUrl: string,
  usersCollection: string,
  providerName: string
): Promise<OAuthStartData> {
  const col = encodeURIComponent(usersCollection);
  const { status, body } = await pbJson(
    pocketbaseUrl,
    `/api/collections/${col}/auth-methods`
  );
  if (status !== 200) {
    throw new PocketBaseError(0, "the account service could not be reached");
  }
  const provider = normalizeProviders(body).find((p) => p.name === providerName);
  if (!provider) {
    throw new PocketBaseError(404, "this sign-in method is not enabled");
  }
  if (provider.codeChallengeMethod && provider.codeChallengeMethod !== "S256") {
    throw new PocketBaseError(503, "this sign-in method is configured incorrectly");
  }
  let authUrl: URL;
  try {
    authUrl = new URL(provider.authUrl);
  } catch {
    throw new PocketBaseError(502, "the account service returned an invalid sign-in address");
  }
  if (!provider.authUrl.endsWith("redirect_uri=")) {
    throw new PocketBaseError(502, "the account service returned an unexpected sign-in address");
  }
  if (authUrl.searchParams.get("state") !== provider.state) {
    throw new PocketBaseError(502, "the account service returned an inconsistent sign-in state");
  }
  if (serverEnv.isProduction() && authUrl.protocol !== "https:") {
    throw new PocketBaseError(502, "the provider sign-in address must use https");
  }
  return {
    authUrl: provider.authUrl,
    provider: {
      name: provider.name,
      displayName: provider.displayName,
      state: provider.state,
      codeVerifier: provider.codeVerifier,
      codeChallengeMethod: provider.codeChallengeMethod,
    },
  };
}

/** Exchanges the provider's code for a PocketBase session (pbToken + user). */
export async function finishOAuth(input: {
  pocketbaseUrl: string;
  usersCollection: string;
  provider: string;
  code: string;
  codeVerifier: string;
  redirectUrl: string;
}): Promise<PbAuthResult> {
  const col = encodeURIComponent(input.usersCollection);
  const { status, body } = await pbJson(
    input.pocketbaseUrl,
    `/api/collections/${col}/auth-with-oauth2`,
    {
      method: "POST",
      body: {
        provider: input.provider,
        code: input.code,
        codeVerifier: input.codeVerifier,
        redirectURL: input.redirectUrl,
      },
    }
  );
  if (status !== 200 || typeof body?.token !== "string" || !body?.record) {
    if (status === 0) throw new PocketBaseError(0, "the account service could not be reached");
    if (status === 429) throw new PocketBaseError(429, "too many attempts; try again in a few minutes");
    throw new PocketBaseError(401, "the sign-in could not be completed");
  }
  const record = body.record;
  return {
    token: body.token,
    user: {
      id: String(record?.id ?? ""),
      email: String(record?.email ?? ""),
      name: String(record?.name ?? ""),
      verified: record?.verified === true,
    },
  };
}
