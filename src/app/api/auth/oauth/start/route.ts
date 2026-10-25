import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { startOAuth, oauthRedirectUrl } from "@/lib/api/account";
import { OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE, sealHandshake } from "@/lib/session/oauth-handshake";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const INSTALL_COOKIE = "devora_web_install";
const PROVIDER_NAME = /^[a-z0-9_]{1,40}$/;

function validInstallId(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_-]{16,64}$/.test(value)) return null;
  return value;
}

/**
 * POST /api/auth/oauth/start { provider } — begins a provider (Google/GitHub)
 * sign-in on the website.
 *
 * 1. Fetches a fresh provider challenge from PocketBase (auth-methods).
 * 2. Computes the website's own callback URL as the redirect_uri.
 * 3. Seals { provider, state, codeVerifier, redirectUrl, installId } into a
 *    short-lived signed HttpOnly cookie.
 * 4. Answers with the provider's auth URL; the browser is redirected there.
 *
 * The flow reuses the `devora_web_install` cookie (or mints one) so the
 * OAuth session binds to the same stable device identity as password sign-in.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = checkRateLimit(rateLimitKey("oauth-start", ip), 20, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        title: "Too many attempts",
        message: "Too many sign-in attempts. Please wait a few minutes and try again.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  if (!serverEnv.sessionSecret()) {
    return NextResponse.json(
      {
        ok: false,
        title: "Sign-in isn’t available yet",
        message:
          "This website can’t start provider sign-in because SESSION_SECRET is not configured. An administrator must set it.",
      },
      { status: 503 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUrl = oauthRedirectUrl(origin);
  if (!redirectUrl) {
    return NextResponse.json(
      {
        ok: false,
        title: "Provider sign-in isn’t available",
        message:
          "The website’s public address is not configured, so provider sign-in cannot redirect back safely. An administrator must set NEXT_PUBLIC_SITE_URL.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }
  const provider =
    typeof (body as { provider?: unknown })?.provider === "string"
      ? (body as { provider: string }).provider.trim()
      : "";
  if (!PROVIDER_NAME.test(provider)) {
    return NextResponse.json({ ok: false, message: "Unknown sign-in provider." }, { status: 400 });
  }

  const cookieStore = request.headers.get("cookie") ?? "";
  const existingInstall = validInstallId(
    cookieStore
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${INSTALL_COOKIE}=`))
      ?.slice(INSTALL_COOKIE.length + 1)
  );
  const installId = existingInstall ?? randomBytes(18).toString("base64url");

  const started = await startOAuth({ provider, redirectUrl });
  if (!started.ok) {
    logger.warn("auth", "OAuth start failed", {
      provider,
      code: started.failure.code,
      status: started.failure.status,
    });
    return NextResponse.json(
      { ok: false, ...started.failure },
      { status: started.failure.status }
    );
  }

  const sealed = sealHandshake({
    provider,
    state: started.data.state,
    codeVerifier: started.data.codeVerifier,
    redirectUrl,
    installId,
  });
  if (!sealed) {
    return NextResponse.json(
      { ok: false, message: "The sign-in could not be prepared. Please try again." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    authUrl: started.data.authUrl + encodeURIComponent(redirectUrl),
  });
  response.cookies.set(OAUTH_COOKIE, sealed, {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return response;
}
