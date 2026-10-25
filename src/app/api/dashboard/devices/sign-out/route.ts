import { NextResponse } from "next/server";
import { signOutDevice } from "@/lib/api/account";
import { authHttpStatus, authStateFromFailure } from "@/lib/api/auth-errors";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  deviceId: z.string().regex(/^[0-9a-fA-F-]{36}$/, "Invalid device id"),
});

/**
 * POST /api/dashboard/devices/sign-out
 * Server-side proxy for POST /v1/account/devices/:id/sign-out — ends another
 * device session of the signed-in account. Requires a website session.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in first." },
      { status: 401 }
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

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid device id." },
      { status: 400 }
    );
  }

  const result = await signOutDevice(session.token, parsed.data.deviceId);
  if (!result.ok) {
    const state = authStateFromFailure({
      code: result.error.code === "not_configured" ? "not_configured" : "upstream_error",
      status: result.error.upstreamStatus ?? 502,
      message: result.error.message,
      upstreamCode: result.error.upstreamCode,
    });
    logger.warn("dashboard", "Device sign-out failed", {
      code: result.error.code,
      status: result.error.upstreamStatus,
    });
    return NextResponse.json(
      { ok: false, ...state },
      { status: authHttpStatus({
          code: result.error.code === "not_configured" ? "not_configured" : "upstream_error",
          status: result.error.upstreamStatus ?? 502,
          message: result.error.message,
          upstreamCode: result.error.upstreamCode,
        }) }
    );
  }

  return NextResponse.json({ ok: true, id: result.data.id, signedIn: result.data.signedIn });
}
