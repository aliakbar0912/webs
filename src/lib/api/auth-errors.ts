import type { ApiErrorCode } from "@/lib/api/client";
import type { UpstreamFailure } from "@/lib/api/account";

/**
 * Map real Devora API / PocketBase failures to honest, user-facing messages.
 *
 * Error codes come from the actual server sources:
 *   - server/src/app.ts:  invalid_api_key, not_found, method_not_allowed, …
 *   - server/src/modules/accounts.ts:  accounts_not_configured,
 *     accounts_unavailable, invalid_credentials, email_not_verified,
 *     device_blocked, device_proof_required, account_blocked, account_deleted
 *   - server/src/modules/devices.ts:   device_blocked, registration_closed, …
 *   - server/src/modules/sessions.ts:  account_blocked, account_deleted
 *   - PocketBase errors surface through the pocketbase adapter.
 */

const TITLES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password",
  email_not_verified: "Verify your email first",
  device_blocked: "This device has been blocked",
  account_blocked: "Account blocked",
  account_deleted: "Account no longer exists",
  registration_closed: "Registration is closed",
  weak_password: "Password not accepted",
  too_many_attempts: "Too many attempts",
  rate_limited: "Too many attempts",
  device_proof_required: "Sign-in needs confirmation",
  not_found: "Endpoint not found",
  method_not_allowed: "Endpoint not found",
  unauthenticated: "Sign-in required",
};

export function authStateFromFailure(failure: UpstreamFailure): {
  title: string;
  message: string;
} {
  const code = failure.upstreamCode;

  if (failure.code === "not_configured") {
    return {
      title: "Sign-in isn’t available yet",
      message: failure.message,
    };
  }
  if (failure.code === "accounts_unavailable") {
    return {
      title: "Accounts aren’t set up yet",
      message: failure.message,
    };
  }
  if (code === "invalid_credentials") {
    return {
      title: "Incorrect email or password",
      message:
        "Check your credentials and try again. You can reset your password if you’ve forgotten it.",
    };
  }
  if (code === "email_not_verified") {
    return {
      title: "Verify your email first",
      message:
        "Open the verification link we emailed you, then sign in again. You can request a new email from the registration page.",
    };
  }
  if (code === "device_blocked" || code === "account_blocked") {
    return {
      title: code === "device_blocked" ? "This device has been blocked" : "Account blocked",
      message:
        "An administrator has blocked access for this device or account. Contact support if you believe this is a mistake.",
    };
  }
  if (code === "account_deleted") {
    return {
      title: "Account no longer exists",
      message: "This account has been deleted. You can create a new one if you need access.",
    };
  }
  if (code === "device_proof_required") {
    return {
      title: "Sign-in needs confirmation",
      message:
        "This browser’s device identity belongs to a different Devora account. We’ll retry with a fresh identity automatically — if it still fails, sign out of the other account in the desktop app first.",
    };
  }
  if (code === "too_many_attempts" || code === "rate_limited") {
    return {
      title: "Too many attempts",
      message: failure.message,
    };
  }
  if (code === "weak_password") {
    return {
      title: "Password not accepted",
      message: failure.message,
    };
  }

  switch (failure.code) {
    case "timeout":
      return {
        title: "The request timed out",
        message: "The Devora API took too long to respond. Please try again.",
      };
    case "network_error":
      return {
        title: "Can’t reach the account service",
        message:
          "The upstream service couldn’t be reached. Check your connection and try again shortly.",
      };
    default:
      return {
        title: "Something unexpected happened",
        message:
          failure.message ||
          "The sign-in service responded unexpectedly. Please try again later.",
      };
  }
}

/** HTTP status our own API should return for an upstream failure. */
export function authHttpStatus(failure: UpstreamFailure): number {
  if (failure.code === "not_configured" || failure.code === "accounts_unavailable") return 503;
  if (failure.code === "pocketbase_error") {
    return failure.status === 429 ? 429 : failure.status >= 400 && failure.status < 500 ? failure.status : 502;
  }
  if (failure.code === "upstream_error") {
    if (failure.status === 429) return 429;
    if (failure.status >= 400 && failure.status < 500) return failure.status;
  }
  if (failure.code === "timeout" || failure.code === "network_error") return 502;
  return 502;
}

/** Legacy helper kept for API-code-based mapping (client.ts ApiError shape). */
export function authStateFromError(
  code: ApiErrorCode,
  upstreamStatus?: number,
  upstreamCode?: string
): { title: string; message: string } {
  return authStateFromFailure({
    code: code === "not_configured" ? "not_configured" : "upstream_error",
    status: upstreamStatus ?? 502,
    message: "",
    upstreamCode,
  });
}
