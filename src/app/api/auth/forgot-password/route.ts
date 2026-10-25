import { NextResponse } from "next/server";
import { requestResetOtp } from "@/lib/api/account";
import { authHttpStatus, authStateFromFailure } from "@/lib/api/auth-errors";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/forgot-password — step 1 of the real reset flow.
 *
 * Asks PocketBase for an email OTP (request-otp). PocketBase answers with an
 * otpId without revealing whether the address exists (no account
 * enumeration); the code only arrives by email for real accounts. Step 2 is
 * POST /api/auth/reset-password with { otpId, otpCode, password }, verified
 * by the Devora API itself.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = checkRateLimit(rateLimitKey("forgot", ip), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        title: "Too many requests",
        message: "Too many reset requests. Please try again later.",
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

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      },
      { status: 400 }
    );
  }

  const result = await requestResetOtp(parsed.data.email);

  if (!result.ok) {
    const state = authStateFromFailure(result.failure);
    logger.warn("auth", "Password reset OTP request failed", {
      code: result.failure.code,
      status: result.failure.status,
    });
    return NextResponse.json(
      { ok: false, ...state },
      { status: authHttpStatus(result.failure) }
    );
  }

  return NextResponse.json({
    ok: true,
    otpId: result.data.otpId,
    message:
      "If that email belongs to a Devora account, a sign-in code is on its way. Enter the code below with your new password.",
  });
}
