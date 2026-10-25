import { NextResponse } from "next/server";
import { devoraLogout } from "@/lib/api/account";
import { destroySession, getSession } from "@/lib/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout — ends the device session upstream (the API's
 * POST /v1/auth/logout releases the device row) and clears the website
 * session cookie. Idempotent: an already-ended session still succeeds.
 */
export async function POST() {
  const session = await getSession();
  if (session) {
    const result = await devoraLogout(session.token);
    if (!result.ok) {
      // The cookie is cleared regardless; upstream session expiry (30 days)
      // or an already-ended session must not trap the user.
      logger.warn("auth", "Upstream logout failed; clearing local session anyway", {
        code: result.error.code,
        status: result.error.upstreamStatus,
      });
    } else {
      logger.info("auth", "Logout succeeded");
    }
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
