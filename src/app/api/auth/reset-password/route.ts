import { NextResponse } from "next/server";
import { resetPasswordWithOtp } from "@/lib/api/account";
import { authHttpStatus, authStateFromFailure } from "@/lib/api/auth-errors";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const resetSchema = z.object({
  otpId: z.string().trim().min(1).max(64),
  otpCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,12}$/, "Enter the numeric code from the email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

/**
 * POST /api/auth/reset-password — step 2 of the real reset flow.
 * The Devora API verifies the OTP itself (POST /v1/auth/password-reset) and
 * rotates the password; every existing device session is ended upstream.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = checkRateLimit(rateLimitKey("reset", ip), 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        title: "Too many requests",
        message: "Too many attempts. Please try again later.",
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

  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 }
    );
  }

  const result = await resetPasswordWithOtp(parsed.data);

  if (!result.ok) {
    const state = authStateFromFailure(result.failure);
    logger.warn("auth", "Password reset failed", {
      code: result.failure.code,
      status: result.failure.status,
      upstreamCode: result.failure.upstreamCode,
    });
    return NextResponse.json(
      { ok: false, ...state },
      { status: authHttpStatus(result.failure) }
    );
  }

  logger.info("auth", "Password reset succeeded");
  return NextResponse.json({
    ok: true,
    message:
      "Your password has been reset. All signed-in devices were signed out for safety — sign in again with your new password.",
  });
}
