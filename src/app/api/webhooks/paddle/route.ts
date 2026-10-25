import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  PbServiceError,
  pbWritesConfigured,
  recordWebhookEvent,
} from "@/lib/api/pb-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/paddle — Paddle Billing webhook receiver.
 *
 * Security:
 * - Signature verified per Paddle spec: `Paddle-Signature: ts=…;h1=…` where
 *   h1 = HMAC-SHA256(`${ts}:${rawBody}`, PADDLE_WEBHOOK_SECRET), compared
 *   timing-safe, with a freshness window to defeat replay.
 * - The secret is server-side only. Sandbox vs live secrets must match
 *   PADDLE_ENV to prevent credential mixing.
 *
 * Idempotency:
 * - Every event_id is stored before processing; duplicates are acknowledged
 *   with 200 and skipped. Processing happens exactly once. When PocketBase
 *   storage is configured the audit ledger lives in the
 *   `website_webhook_events` collection (unique eventId index); otherwise the
 *   local operational database is used.
 *
 * Scope note (see INTEGRATION.md): the upstream Devora API does not yet expose
 * confirmed billing routes, so verified events are stored for audit here and
 * entitlement synchronization must be wired to real upstream billing routes
 * once they exist. No local entitlements are granted from frontend redirects.
 */

const MAX_AGE_SECONDS = 5 * 60; // replay window
const MAX_BODY_BYTES = 256 * 1024;

interface PaddleEvent {
  event_id?: unknown;
  event_type?: unknown;
  occurred_at?: unknown;
  data?: unknown;
}

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): { valid: boolean; reason?: string } {
  if (!signatureHeader) return { valid: false, reason: "missing signature header" };

  const parts = signatureHeader.split(";").reduce<Record<string, string>>(
    (acc, part) => {
      const [key, value] = part.split("=", 2);
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    },
    {}
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return { valid: false, reason: "malformed signature header" };

  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return { valid: false, reason: "invalid timestamp" };
  if (Math.abs(Date.now() / 1000 - tsNumber) > MAX_AGE_SECONDS) {
    return { valid: false, reason: "timestamp outside replay window" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");
  const a = Buffer.from(h1, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "signature mismatch" };
  }
  return { valid: true };
}

export async function POST(request: Request) {
  const secret = serverEnv.billing.webhookSecret();
  if (!secret) {
    // Honest state: the webhook exists but is not armed yet.
    logger.warn("paddle", "Webhook received but PADDLE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      {
        received: false,
        error:
          "Webhook verification is not configured on this server yet. Set PADDLE_WEBHOOK_SECRET to enable.",
      },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { received: false, error: "Payload too large." },
      { status: 413 }
    );
  }

  const check = verifySignature(
    rawBody,
    request.headers.get("paddle-signature"),
    secret
  );
  if (!check.valid) {
    logger.warn("paddle", "Webhook signature rejected", { reason: check.reason });
    return NextResponse.json(
      { received: false, error: "Invalid signature." },
      { status: 401 }
    );
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return NextResponse.json(
      { received: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const eventId = typeof event.event_id === "string" ? event.event_id : null;
  const eventType = typeof event.event_type === "string" ? event.event_type : "unknown";
  if (!eventId) {
    return NextResponse.json(
      { received: false, error: "Missing event_id." },
      { status: 400 }
    );
  }

  try {
    if (pbWritesConfigured()) {
      // Central audit ledger in PocketBase (unique index on eventId).
      const result = await recordWebhookEvent({ eventId, eventType, payload: rawBody });
      if (result.duplicate) {
        logger.info("paddle", "Duplicate webhook event ignored", { eventId, eventType });
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else {
      // Fallback: local operational database (unique eventId constraint).
      await db.paddleWebhookEvent.create({
        data: { eventId, eventType, payload: rawBody },
      });
    }
  } catch (err) {
    if (err instanceof PbServiceError && err.unreachable) {
      logger.error("paddle", "PocketBase storage unreachable; asking Paddle to retry", { eventId });
      return NextResponse.json(
        { received: false, error: "Event storage is temporarily unavailable; retry later." },
        { status: 503 }
      );
    }
    logger.info("paddle", "Duplicate webhook event ignored", { eventId, eventType });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Extension point: forward verified events to the upstream billing routes
  // once those are confirmed (see INTEGRATION.md §3). Events are retained for
  // audit so synchronization can be replayed safely.
  logger.info("paddle", "Webhook event accepted", { eventId, eventType });

  return NextResponse.json({ received: true });
}
