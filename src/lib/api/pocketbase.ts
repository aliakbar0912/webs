/**
 * Website-side PocketBase client.
 *
 * Devora identities live in PocketBase (see server/src/pocketbase.ts): the
 * desktop app signs in with PocketBase directly and hands the API a pbToken.
 * The website does the same, server-side only:
 *   - auth-with-password (login) -> pbToken
 *   - create record (registration; the API has no register route)
 *   - request-otp (forgot password step 1; the API's /v1/auth/password-reset
 *     verifies the OTP itself)
 *   - request-verification (resend verification email)
 *
 * The pbToken is short-lived, held only in memory for the duration of the
 * request, and NEVER stored or logged. All calls are HTTPS with timeouts.
 */

import "server-only";
import { logger } from "@/lib/logger";

const TIMEOUT_MS = 10_000;

export class PocketBaseError extends Error {
  readonly status: number;
  /** Field-level validation messages from PocketBase, when present. */
  readonly fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "PocketBaseError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface PbAuthResult {
  token: string;
  user: { id: string; email: string; name: string; verified: boolean };
}

function assertHttps(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new PocketBaseError(0, "PocketBase URL must use https");
  }
  return parsed.origin;
}

async function pbCall(
  base: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: any }> {
  let res: Response;
  try {
    res = await fetch(assertHttps(base) + path, {
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

/** Normalizes a PocketBase validation failure into field messages. */
function extractFieldErrors(body: any): Record<string, string> {
  const out: Record<string, string> = {};
  const data = body?.data;
  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "message" in (value as Record<string, unknown>)) {
        const message = (value as { message?: unknown }).message;
        if (typeof message === "string") out[key] = message;
      }
    }
  }
  return out;
}

function toPbUser(record: any): PbAuthResult["user"] {
  return {
    id: String(record?.id ?? ""),
    email: String(record?.email ?? ""),
    name: String(record?.name ?? ""),
    verified: record?.verified === true,
  };
}

/** Email/password sign-in against PocketBase (the same call the desktop makes). */
export async function authWithPassword(
  baseUrl: string,
  usersCollection: string,
  email: string,
  password: string
): Promise<PbAuthResult> {
  const col = encodeURIComponent(usersCollection);
  const { status, body } = await pbCall(baseUrl, `/api/collections/${col}/auth-with-password`, {
    method: "POST",
    body: { identity: email, password },
  });
  if (status !== 200 || typeof body?.token !== "string") {
    if (status === 0) throw new PocketBaseError(0, "the account service could not be reached");
    if (status === 429) throw new PocketBaseError(429, "too many attempts; try again in a few minutes");
    // PocketBase may start an MFA flow; surface an honest message either way.
    const message =
      typeof body?.message === "string" && body.message
        ? body.message
        : "the email or password is not correct";
    throw new PocketBaseError(status || 401, message, extractFieldErrors(body));
  }
  return { token: body.token, user: toPbUser(body.record) };
}

/** Creates a new user record (website registration; PocketBase owns identities). */
export async function createUser(
  baseUrl: string,
  usersCollection: string,
  input: { email: string; password: string }
): Promise<void> {
  const col = encodeURIComponent(usersCollection);
  const { status, body } = await pbCall(baseUrl, `/api/collections/${col}/records`, {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      passwordConfirm: input.password,
    },
  });
  if (status !== 200 && status !== 204) {
    if (status === 0) throw new PocketBaseError(0, "the account service could not be reached");
    if (status === 403) throw new PocketBaseError(403, "registration is not open on this server right now");
    const fieldErrors = extractFieldErrors(body);
    const first = Object.values(fieldErrors)[0];
    throw new PocketBaseError(
      status || 400,
      first ?? (typeof body?.message === "string" ? body.message : "the account could not be created"),
      fieldErrors
    );
  }
}

/** Asks PocketBase to send the verification email for a just-created account. */
export async function requestVerification(
  baseUrl: string,
  usersCollection: string,
  email: string
): Promise<void> {
  const col = encodeURIComponent(usersCollection);
  const { status } = await pbCall(baseUrl, `/api/collections/${col}/request-verification`, {
    method: "POST",
    body: { email },
  });
  if (status !== 200 && status !== 204) {
    logger.warn("pocketbase", "request-verification failed", { status });
  }
}

/** Requests an email OTP for password reset. Returns the otpId for the reset step. */
export async function requestOtp(
  baseUrl: string,
  usersCollection: string,
  email: string
): Promise<{ otpId: string }> {
  const col = encodeURIComponent(usersCollection);
  const { status, body } = await pbCall(baseUrl, `/api/collections/${col}/request-otp`, {
    method: "POST",
    body: { email },
  });
  if (status !== 200 || typeof body?.otpId !== "string") {
    if (status === 0) throw new PocketBaseError(0, "the account service could not be reached");
    if (status === 429) throw new PocketBaseError(429, "too many attempts; try again in a few minutes");
    throw new PocketBaseError(status || 400, "the reset code could not be sent; try again shortly");
  }
  return { otpId: body.otpId };
}
