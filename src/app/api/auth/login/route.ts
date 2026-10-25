import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/api/account";
import { authHttpStatus, authStateFromFailure } from "@/lib/api/auth-errors";
import { createSession } from "@/lib/session";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/login — real Devora sign-in flow:
 *   1. PocketBase auth-with-password (server-side; pbToken never leaves the server)
 *   2. POST /v1/auth/session { pbToken, installId, deviceName } → device token
 *   3. Signed HttpOnly website session cookie holding the device token
 *
 * Device identity: a stable random install id lives in a `devora_web_install`
 * cookie, so repeat sign-ins from the same browser rebind the same device row.
 * If the API answers 409 device_proof_required (the identity belongs to a
 * different account), the flow retries ONCE with a fresh identity — the same
 * thing a brand-new desktop install does. A blocked device is never retried.
 */

const INSTALL_COOKIE = "devora_web_install";
const INSTALL_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function newInstallId(): string {
  // 24 chars of [A-Za-z0-9_-] — matches the API's INSTALL_ID rule (16-64).
  return randomBytes(18).toString("base64url");
}

function validInstallId(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_-]{16,64}$/.test(value)) return null;
  return value;
}

/** Short honest device name derived from the browser's User-Agent. */
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

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // Brute-force protection: 10 attempts / 15 min / IP (the API applies its own too).
  const limit = checkRateLimit(rateLimitKey("login", ip), 10, 15 * 60 * 1000);
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

  // Refuse early when the website cannot persist sessions — avoid creating
  // upstream device rows for sessions that could never be used.
  if (!serverEnv.sessionSecret()) {
    return NextResponse.json(
      {
        ok: false,
        title: "Sign-in isn’t available yet",
        message:
          "This website can’t create sessions because SESSION_SECRET is not configured. An administrator must set it.",
      },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 }
    );
  }

  const cookieStore = request.headers.get("cookie") ?? "";
  const existingInstall = validInstallId(
    cookieStore
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${INSTALL_COOKIE}=`))
      ?.slice(INSTALL_COOKIE.length + 1)
  );
  const deviceName = deviceNameFromUserAgent(request.headers.get("user-agent"));

  let installId = existingInstall ?? newInstallId();
  let result = await signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    installId,
    deviceName,
  });

  // The install identity belongs to a different account → retry once with a
  // fresh one (never on device_blocked: that would circumvent an owner block).
  if (
    !result.ok &&
    result.failure.upstreamCode === "device_proof_required"
  ) {
    logger.info("auth", "Install identity rebinding; retrying with fresh install id");
    installId = newInstallId();
    result = await signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
      installId,
      deviceName,
    });
  }

  if (!result.ok) {
    const state = authStateFromFailure(result.failure);
    logger.warn("auth", "Login failed", {
      code: result.failure.code,
      status: result.failure.status,
      upstreamCode: result.failure.upstreamCode,
    });
    return NextResponse.json(
      { ok: false, ...state },
      { status: authHttpStatus(result.failure) }
    );
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
    return NextResponse.json(
      {
        ok: false,
        title: "Sign-in could not be completed",
        message:
          "Authentication succeeded, but this website can’t create sessions because SESSION_SECRET is not configured.",
      },
      { status: 503 }
    );
  }

  logger.info("auth", "Login succeeded", {
    deviceId: result.data.deviceId,
    claimed: result.data.claimed,
  });

  const response = NextResponse.json({
    ok: true,
    account: {
      email: result.data.user.email,
      name: result.data.user.name || null,
    },
  });
  response.cookies.set(INSTALL_COOKIE, installId, {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: INSTALL_COOKIE_MAX_AGE,
  });
  return response;
}
