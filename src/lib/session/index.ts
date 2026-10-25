/**
 * Website session management.
 *
 * Design constraints:
 * - There is NO local user database. A session exists only after the upstream
 *   API has successfully authenticated the user (see INTEGRATION.md).
 * - The session is a signed, HttpOnly, SameSite=Lax cookie holding the minimum
 *   needed to call the upstream API on the user's behalf: their upstream token.
 * - The signing secret (SESSION_SECRET) is server-side only.
 * - Desktop device tokens are NEVER accepted here; website sessions and desktop
 *   device enrollment remain separate authentication surfaces.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const COOKIE_NAME = "devora_session";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  /** Upstream account id — display only; authorization defers to the API. */
  sub: string;
  email: string;
  name?: string;
  /**
   * Devora DEVICE token issued by POST /v1/auth/session for this browser.
   * The website is a normal Devora client: PocketBase owns the identity and
   * the API binds one device row per web sign-in, exactly like the desktop.
   */
  token: string;
  /** The device row this session is bound to (shown as "current" in /v1/account). */
  deviceId?: string;
  /** ISO expiry of the device token (30 days by default on the API). */
  tokenExpiresAt?: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadJson: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadJson).digest("base64url");
}

export async function createSession(input: {
  token: string;
  email: string;
  sub?: string;
  name?: string;
  deviceId?: string;
  /** ISO timestamp of the upstream device token expiry. */
  tokenExpiresAt?: string;
}): Promise<{ ok: true } | { ok: false; reason: "no_secret" }> {
  const secret = serverEnv.sessionSecret();
  if (!secret) {
    logger.error("session", "SESSION_SECRET is not set; refusing to create session");
    return { ok: false, reason: "no_secret" };
  }
  // Cookie lifetime mirrors the upstream device token (max 30 days); the
  // minimum keeps short-lived tokens usable without trapping users.
  let ttl = DEFAULT_TTL_SECONDS;
  if (input.tokenExpiresAt) {
    const expiryMs = Date.parse(input.tokenExpiresAt);
    if (Number.isFinite(expiryMs)) {
      ttl = Math.min(Math.max(Math.floor((expiryMs - Date.now()) / 1000), 300), 30 * 24 * 60 * 60);
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: input.sub ?? input.email,
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
    token: input.token,
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
    ...(input.tokenExpiresAt ? { tokenExpiresAt: input.tokenExpiresAt } : {}),
    iat: now,
    exp: now + ttl,
  };

  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, secret);
  const store = await cookies();
  store.set(COOKIE_NAME, `${body}.${sig}`, {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
  return { ok: true };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: serverEnv.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const secret = serverEnv.sessionSecret();
  if (!secret) return null;
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    logger.warn("session", "Session cookie signature mismatch");
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.token !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

/** Server-side guard for authenticated pages. Returns null → caller redirects. */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}
