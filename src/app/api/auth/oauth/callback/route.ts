import { NextResponse } from "next/server";
import { completeOAuth } from "@/lib/api/account";
import { OAUTH_COOKIE, openHandshake } from "@/lib/session/oauth-handshake";
import { createSession } from "@/lib/session";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const INSTALL_COOKIE = "devora_web_install";
const INSTALL_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Where to send the browser after an attempted provider sign-in. */
function loginWithError(code: string): string {
  return `/login?oauth_error=${encodeURIComponent(code)}`;
}

/**
 * GET /api/auth/oauth/callback?code&state — the provider's redirect.
 *
 * Verifies the signed handshake cookie (provider + state + redirect URL),
 * lets PocketBase exchange the code (it holds the client secret; PKCE S256),
 * binds a Devora web device exactly like the password flow, then redirects
 * to /dashboard. Every failure path clears the handshake cookie and lands
 * on /login with an honest oauth_error code. Tokens never touch the URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const handshake = openHandshake(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${OAUTH_COOKIE}=`))
      ?.slice(OAUTH_COOKIE.length + 1)
  );

  if (!handshake) {
    return redirectWithClear(url.origin, loginWithError("expired"));
  }

  const providerError = url.searchParams.get("error");
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  if (providerError || !code || code.length > 2048) {
    logger.warn("auth", "OAuth callback returned an error", {
      provider: handshake.provider,
      error: providerError ?? "missing_code",
    });
    return redirectWithClear(
      url.origin,
      loginWithError(providerError === "access_denied" ? "cancelled" : "provider_error")
    );
  }

  if (state !== handshake.state || !OAUTH_STATE.test(state)) {
    logger.warn("auth", "OAuth state mismatch", { provider: handshake.provider });
    return redirectWithClear(url.origin, loginWithError("expired"));
  }

  const deviceName = deviceNameFromUserAgent(request.headers.get("user-agent"));
  const result = await completeOAuth({
    provider: handshake.provider,
    code,
    codeVerifier: handshake.codeVerifier,
    redirectUrl: handshake.redirectUrl,
    installId: handshake.installId,
    deviceName,
  });

  if (!result.ok) {
    const failure = result.failure;
    logger.warn("auth", "OAuth sign-in failed", {
      provider: handshake.provider,
      code: failure.code,
      status: failure.status,
    });
    const map: Record<string, string> = {
      email_not_verified: "email_not_verified",
      accounts_unavailable: "accounts_unavailable",
    };
    const error =
      failure.code === "upstream_error" || failure.code === "pocketbase_error"
        ? "sign_in_failed"
        : (map[failure.code] ?? "sign_in_failed");
    return redirectWithClear(url.origin, loginWithError(error));
  }

  const session = await createSession({
    token: result.data.token,
    email: result.data.user.email,
    sub: result.data.user.id,
    name: result.data.user.name || undefined,
    deviceId: result.data.deviceId,
    tokenExpiresAt: result.data.tokenExpiresAt,
  });
  if (!session.ok) {
    logger.error("auth", "OAuth sign-in could not persist a session");
    return redirectWithClear(url.origin, loginWithError("session_unavailable"));
  }

  logger.info("auth", "OAuth sign-in succeeded", {
    provider: handshake.provider,
    deviceId: result.data.deviceId,
  });

  // Reuse the install identity the handshake carried (may be brand-new).
  const response = NextResponse.redirect(new URL("/dashboard", url.origin));
  response.cookies.set(INSTALL_COOKIE, handshake.installId, {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: INSTALL_COOKIE_MAX_AGE,
  });
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

const OAUTH_STATE = /^[A-Za-z0-9_.~-]{8,200}$/;

function redirectWithClear(origin: string, location: string): NextResponse {
  const res = NextResponse.redirect(new URL(location, origin));
  res.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/** Short honest device name derived from the browser's User-Agent (same as login). */
function deviceNameFromUserAgent(ua: string | null): string {
  const ua2 = ua ?? "";
  const browser = /Edg\//.test(ua2)
    ? "Edge"
    : /OPR\//.test(ua2)
      ? "Opera"
      : /Chrome\//.test(ua2)
        ? "Chrome"
        : /Firefox\//.test(ua2)
          ? "Firefox"
          : /Safari\//.test(ua2)
            ? "Safari"
            : null;
  const os = /Windows/.test(ua2)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua2)
      ? "macOS"
      : /Android/.test(ua2)
        ? "Android"
        : /iPhone|iPad/.test(ua2)
          ? "iOS"
          : /Linux/.test(ua2)
            ? "Linux"
            : null;
  if (!browser && !os) return "Web browser";
  return `Web · ${[browser, os].filter(Boolean).join(" on ")}`.slice(0, 80);
}
