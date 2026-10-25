/**
 * PocketBase service client — server-side only.
 *
 * The website keeps its operational data (support messages, Paddle webhook
 * audit events, published pricing plans) in the SAME PocketBase instance that
 * owns Devora identities — the admin API's account store. Collections are
 * dedicated `website_*` collections created once by the owner with
 * scripts/setup-website-collections.mjs (see INTEGRATION.md).
 *
 * Security properties (mirrors server/src/pocketbase.ts of the API server):
 * - A DEDICATED superuser (DEVORA_PB_ADMIN_EMAIL / DEVORA_PB_ADMIN_PASSWORD)
 *   signs in to /api/collections/_superusers/auth-with-password; the token is
 *   held in process memory only, refreshed before expiry, never logged.
 * - All requests are HTTPS in production (plain http is allowed only outside
 *   production so a local PocketBase can be used during development).
 * - Hard timeouts on every call; network failures throw typed errors that
 *   callers must handle honestly (no silent success).
 * - Pricing plans are read PUBLICLY (no credentials) using the collection's
 *   public list rule installed by the setup script.
 */

import "server-only";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const TIMEOUT_MS = 10_000;

export class PbServiceError extends Error {
  readonly status: number;
  /** True when PocketBase itself could not be reached (network/DNS/TLS). */
  readonly unreachable: boolean;
  constructor(status: number, message: string, unreachable = false) {
    super(message);
    this.name = "PbServiceError";
    this.status = status;
    this.unreachable = unreachable;
  }
}

function resolveBaseUrl(): string | null {
  const raw = serverEnv.pb.url();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    logger.error("pb-service", "DEVORA_PB_URL is not a valid URL");
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    logger.error("pb-service", "DEVORA_PB_URL must start with https:// (or http:// outside production)");
    return null;
  }
  if (parsed.protocol === "http:" && serverEnv.isProduction()) {
    logger.error("pb-service", "DEVORA_PB_URL must use https in production");
    return null;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    logger.error("pb-service", "DEVORA_PB_URL must not contain credentials, a query or a fragment");
    return null;
  }
  return parsed.origin;
}

/** True when the PocketBase storage service is fully configured. */
export function pbStoreConfigured(): boolean {
  if (!serverEnv.pb.url()) return false;
  // Credentials are only needed for writes; public pricing read works without.
  return true;
}

/** True when superuser writes (support messages, webhook events) are usable. */
export function pbWritesConfigured(): boolean {
  return Boolean(serverEnv.pb.url() && serverEnv.pb.adminEmail() && serverEnv.pb.adminPassword());
}

async function pbFetch(
  base: string,
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {}
): Promise<{ status: number; body: any }> {
  let res: Response;
  try {
    res = await fetch(base + path, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(init.token ? { authorization: init.token } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new PbServiceError(0, "the PocketBase service could not be reached", true);
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

// ---------------------------------------------------------------------------
// Superuser session (mirrors the API server's own client)
// ---------------------------------------------------------------------------

let cachedToken: { token: string; until: number } | null = null;
let pendingSignIn: Promise<string> | null = null;

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function superuserToken(force = false): Promise<string> {
  const base = resolveBaseUrl();
  const email = serverEnv.pb.adminEmail();
  const password = serverEnv.pb.adminPassword();
  if (!base || !email || !password) {
    throw new PbServiceError(503, "PocketBase storage is not configured on this website server");
  }
  if (!force && cachedToken && cachedToken.until > Date.now()) return cachedToken.token;
  if (!pendingSignIn) {
    pendingSignIn = (async () => {
      const r = await pbFetch(base, "/api/collections/_superusers/auth-with-password", {
        method: "POST",
        body: { identity: email, password },
      });
      if (r.status !== 200 || typeof r.body?.token !== "string") {
        throw new PbServiceError(
          r.status === 0 ? 0 : 502,
          "the website could not sign in to PocketBase storage"
        );
      }
      const token = r.body.token as string;
      const exp = jwtExp(token);
      cachedToken = {
        token,
        // Renew a minute before PB's own expiry, and at least every 30 minutes.
        until: Math.min(exp ? exp - 60_000 : Date.now() + 600_000, Date.now() + 30 * 60_000),
      };
      return token;
    })().finally(() => {
      pendingSignIn = null;
    });
  }
  return pendingSignIn;
}

/** Authenticated request with one automatic re-sign-in on 401/403. */
async function adminCall(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  const base = resolveBaseUrl();
  if (!base) throw new PbServiceError(503, "PocketBase storage is not configured");
  let token = await superuserToken();
  let r = await pbFetch(base, path, { method, body, token });
  if (r.status === 401 || r.status === 403) {
    token = await superuserToken(true);
    r = await pbFetch(base, path, { method, body, token });
  }
  return r;
}

/** Public (unauthenticated) request — used for pricing reads. */
async function publicCall(
  method: string,
  path: string
): Promise<{ status: number; body: any }> {
  const base = resolveBaseUrl();
  if (!base) throw new PbServiceError(503, "PocketBase storage is not configured");
  return pbFetch(base, path, { method });
}

function collection(): string {
  return encodeURIComponent(serverEnv.pb.pricingCollection());
}

// ---------------------------------------------------------------------------
// Typed storage operations
// ---------------------------------------------------------------------------

export interface StoredSupportMessage {
  name: string | null;
  email: string;
  subject: string;
  category: string;
  message: string;
  /** Whether the optional webhook delivery also succeeded. */
  delivered: boolean;
}

/** Creates a support message record. Throws PbServiceError on any failure. */
export async function storeSupportMessage(input: StoredSupportMessage): Promise<void> {
  const col = encodeURIComponent(serverEnv.pb.supportCollection());
  const r = await adminCall("POST", `/api/collections/${col}/records`, {
    name: input.name,
    email: input.email,
    subject: input.subject,
    category: input.category,
    message: input.message,
    status: input.delivered ? "delivered" : "stored",
  });
  if (r.status !== 200 && r.status !== 204) {
    const detail =
      typeof r.body?.message === "string" && r.body.message
        ? r.body.message
        : "PocketBase rejected the support message";
    throw new PbServiceError(r.status || 502, detail);
  }
}

export interface StoredWebhookEvent {
  eventId: string;
  eventType: string;
  /** Raw JSON payload kept for audit/replay. */
  payload: string;
}

/** Result of the idempotent webhook insert. */
export type WebhookStoreResult = { duplicate: false } | { duplicate: true };

/**
 * Records a webhook event exactly once. PocketBase enforces a unique index on
 * eventId (installed by the setup script); a duplicate insert is surfaced as
 * `duplicate: true` so the caller can acknowledge the redelivery safely.
 */
export async function recordWebhookEvent(input: StoredWebhookEvent): Promise<WebhookStoreResult> {
  const col = encodeURIComponent(serverEnv.pb.webhookEventsCollection());
  const filter = encodeURIComponent(`(eventId = "${input.eventId.replace(/"/g, "")}")`);
  const existing = await adminCall("GET", `/api/collections/${col}/records?filter=${filter}&perPage=1`);
  if (existing.status === 200 && Array.isArray(existing.body?.items) && existing.body.items.length > 0) {
    return { duplicate: true };
  }
  const r = await adminCall("POST", `/api/collections/${col}/records`, {
    eventId: input.eventId,
    eventType: input.eventType,
    payload: input.payload,
  });
  if (r.status === 400 && existing.status !== 200) {
    // Collection missing → honest failure (caller decides).
    throw new PbServiceError(r.status, "PocketBase rejected the webhook event");
  }
  if (r.status === 400) {
    // Race: another worker inserted the same eventId between check and insert.
    return { duplicate: true };
  }
  if (r.status !== 200 && r.status !== 204) {
    const detail =
      typeof r.body?.message === "string" && r.body.message
        ? r.body.message
        : "PocketBase rejected the webhook event";
    throw new PbServiceError(r.status || 502, detail);
  }
  return { duplicate: false };
}

// ---------------------------------------------------------------------------
// Pricing plans (public read — no credentials)
// ---------------------------------------------------------------------------

export interface PbPricingPlan {
  planId: string;
  name: string;
  tagline: string | null;
  billingPeriod: "month" | "year";
  priceDisplay: string | null;
  paddlePriceId: string | null;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
}

function toPlan(rec: any): PbPricingPlan | null {
  if (!rec || typeof rec !== "object") return null;
  const planId = typeof rec.planId === "string" ? rec.planId.slice(0, 64) : "";
  const name = typeof rec.name === "string" ? rec.name.slice(0, 120) : "";
  if (!planId || !name) return null;
  const period = rec.billingPeriod === "year" ? "year" : "month";
  const priceDisplay =
    typeof rec.priceDisplay === "string" && rec.priceDisplay.trim()
      ? rec.priceDisplay.trim().slice(0, 32)
      : null;
  const paddlePriceId =
    typeof rec.paddlePriceId === "string" && rec.paddlePriceId.trim()
      ? rec.paddlePriceId.trim().slice(0, 128)
      : null;
  let features: string[] = [];
  if (Array.isArray(rec.features)) {
    features = rec.features
      .filter((f: unknown): f is string => typeof f === "string")
      .map((f: string) => f.slice(0, 200))
      .slice(0, 12);
  }
  return {
    planId,
    name,
    tagline: typeof rec.tagline === "string" && rec.tagline.trim() ? rec.tagline.trim().slice(0, 200) : null,
    billingPeriod: period,
    priceDisplay,
    paddlePriceId,
    features,
    highlighted: rec.highlighted === true,
    sortOrder: typeof rec.sortOrder === "number" && Number.isFinite(rec.sortOrder) ? rec.sortOrder : 100,
  };
}

/**
 * Reads published pricing plans from PocketBase. Returns `null` when the
 * service is not configured or the collection does not exist (the caller then
 * falls back to the env-based configuration), and `[]` when the collection
 * exists but the owner has not published any enabled plan yet.
 */
export async function fetchPublishedPricingPlans(): Promise<PbPricingPlan[] | null> {
  if (!pbStoreConfigured()) return null;
  try {
    const col = collection();
    const r = await publicCall(
      "GET",
      `/api/collections/${col}/records?filter=${encodeURIComponent("(enabled = true)")}&sort=sortOrder&perPage=20`
    );
    if (r.status === 404) return null; // collection not set up yet
    if (r.status !== 200) {
      logger.warn("pb-service", "pricing read failed", { status: r.status });
      return null;
    }
    if (!Array.isArray(r.body?.items)) return null;
    return r.body.items.map(toPlan).filter((p: PbPricingPlan | null): p is PbPricingPlan => p !== null);
  } catch (err) {
    if (err instanceof PbServiceError && err.unreachable) {
      logger.warn("pb-service", "PocketBase unreachable for pricing read");
    } else {
      logger.warn("pb-service", "pricing read error", { err });
    }
    return null;
  }
}
