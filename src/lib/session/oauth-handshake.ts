/**
 * Short-lived signed cookie carrying the OAuth handshake while the user is
 * away at the provider (Google/GitHub/…).
 *
 * Contents: { provider, state, codeVerifier, redirectUrl, installId, exp }.
 * The cookie is HMAC-signed with SESSION_SECRET — the same mechanism as the
 * session cookie — and lives at most 10 minutes. SameSite=Lax lets it ride
 * along on the provider's top-level redirect back to the callback URL.
 *
 * The codeVerifier is a PKCE secret: it is only ever stored in this signed,
 * HttpOnly cookie and is cleared the moment the handshake completes or fails.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env";

const COOKIE_NAME = "devora_oauth";
const MAX_AGE_SECONDS = 10 * 60;

export interface OAuthHandshake {
  provider: string;
  /** PocketBase's provider state — must match the ?state the provider returns. */
  state: string;
  codeVerifier: string;
  redirectUrl: string;
  installId: string;
  exp: number;
}

export const OAUTH_COOKIE = COOKIE_NAME;
export const OAUTH_COOKIE_MAX_AGE = MAX_AGE_SECONDS;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function sealHandshake(data: Omit<OAuthHandshake, "exp">): string | null {
  const secret = serverEnv.sessionSecret();
  if (!secret) return null;
  const payload: OAuthHandshake = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function openHandshake(raw: string | undefined): OAuthHandshake | null {
  const secret = serverEnv.sessionSecret();
  if (!secret || !raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthHandshake;
    if (
      typeof payload.provider !== "string" ||
      typeof payload.state !== "string" ||
      typeof payload.codeVerifier !== "string" ||
      typeof payload.redirectUrl !== "string" ||
      typeof payload.installId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
