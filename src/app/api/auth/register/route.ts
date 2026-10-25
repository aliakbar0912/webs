import { NextResponse } from "next/server";
import { registerWithPassword } from "@/lib/api/account";
import { authHttpStatus, authStateFromFailure } from "@/lib/api/auth-errors";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 *
 * The Devora API has NO registration endpoint (verified: registration lives
 * in PocketBase). The website creates the PocketBase record server-side and
 * asks PocketBase to send the verification email. After verifying, the user
 * signs in normally. Nothing is faked: if PocketBase refuses (validation,
 * closed signup), the real reason is surfaced.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = checkRateLimit(rateLimitKey("register", ip), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        title: "Too many attempts",
        message: "Too many registration attempts. Please try again later.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
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

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 }
    );
  }

  const result = await registerWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (!result.ok) {
    const state = authStateFromFailure(result.failure);
    logger.warn("auth", "Registration failed", {
      code: result.failure.code,
      status: result.failure.status,
      upstreamCode: result.failure.upstreamCode,
    });
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: result.failure.fieldErrors,
        ...state,
      },
      { status: authHttpStatus(result.failure) }
    );
  }

  logger.info("auth", "Registration succeeded (PocketBase record created)");
  return NextResponse.json({
    ok: true,
    message:
      "Account created. Check your inbox for the verification email — after verifying, sign in with your new password.",
  });
}
