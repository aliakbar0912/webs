import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { supportSchema } from "@/lib/validation/support";
import {
  PbServiceError,
  pbWritesConfigured,
  storeSupportMessage,
} from "@/lib/api/pb-service";

export const runtime = "nodejs";

/**
 * POST /api/support
 *
 * Server-side validated support form endpoint.
 * - Zod validation (shared schema with the client)
 * - Honeypot spam trap + per-IP rate limiting
 * - Storage: when PocketBase storage is configured (DEVORA_PB_URL + website
 *   superuser), the message is stored in the `website_support_messages`
 *   collection — the same PocketBase that owns Devora accounts, visible to
 *   the owner in the PocketBase admin UI. Otherwise it falls back to the
 *   local operational database. Delivery to SUPPORT_WEBHOOK_URL is attempted
 *   in addition, when configured.
 * - The response is honest about whether delivery actually happened.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = checkRateLimit(rateLimitKey("support", ip), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many messages sent recently. Please try again later.",
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      }
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

  const parsed = supportSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        message: first
          ? `${first.path.join(".") || "Form"}: ${first.message}`
          : "Validation failed. Please check the form.",
      },
      { status: 400 }
    );
  }

  const { name, email, subject, category, message } = parsed.data;

  // Honeypot tripped → pretend success to the bot, store nothing.
  if (parsed.data.website !== "") {
    logger.warn("support", "Honeypot triggered", { ip });
    return NextResponse.json({ ok: true, delivered: false });
  }

  const webhookUrl = serverEnv.supportWebhookUrl();
  let delivered = false;

  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      if (url.protocol === "https:") {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "devora.support_message",
            name: name || null,
            email,
            subject,
            category,
            message,
          }),
          signal: AbortSignal.timeout(8_000),
        });
        delivered = response.ok;
        if (!delivered) {
          logger.warn("support", "Support webhook delivery failed", {
            status: response.status,
          });
        }
      } else {
        logger.warn("support", "SUPPORT_WEBHOOK_URL must be https; skipping delivery");
      }
    } catch (err) {
      logger.warn("support", "Support webhook delivery error", { err });
    }
  }

  const record = {
    name: name || null,
    email,
    subject,
    category,
    message,
  };

  if (pbWritesConfigured()) {
    // Central storage in PocketBase (the admin API's account store).
    try {
      await storeSupportMessage({ ...record, delivered });
    } catch (err) {
      const unreachable = err instanceof PbServiceError && err.unreachable;
      logger.error("support", "PocketBase storage failed", { err });
      return NextResponse.json(
        {
          ok: false,
          message: unreachable
            ? "The support inbox is temporarily unreachable. Please try again in a few minutes."
            : "We could not record your message due to a server issue. Please try again later.",
        },
        { status: 503 }
      );
    }
  } else {
    // Fallback: local operational database (PocketBase storage not configured).
    try {
      await db.supportMessage.create({
        data: { ...record, status: delivered ? "delivered" : "stored" },
      });
    } catch (err) {
      logger.error("support", "Failed to persist support message", { err });
      return NextResponse.json(
        {
          ok: false,
          message:
            "We could not record your message due to a server issue. Please try again later.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    delivered,
    message: delivered
      ? "Your message has been delivered to the Devora team. We will reply to your email as soon as possible."
      : "Your message has been recorded. Note: email delivery is not configured yet, so our team reviews these messages directly in the admin records. You can also reach us while this is being set up.",
  });
}
