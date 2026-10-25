/**
 * Devora API endpoint map — verified against the real server source
 * (adminserver/server/src/app.ts). Paths are env-overridable so a changed
 * deployment can be adapted without code edits, but the defaults are now the
 * CONFIRMED routes, not guesses.
 *
 * Route table highlights (server/src/app.ts):
 *   GET  /healthz                       (keyless)
 *   GET  /readyz                        (keyless)
 *   GET  /v1/auth/config                accounts on/off, providers, PB url
 *   POST /v1/auth/session               pbToken + installId + deviceName -> device token
 *   POST /v1/auth/refresh               rotate the device token (Bearer)
 *   POST /v1/auth/logout                end this device session (Bearer)
 *   POST /v1/auth/password-reset        { otpId, otpCode, password }
 *   GET  /v1/account                    user + identities + devices (Bearer)
 *   POST /v1/account/devices/:id/sign-out
 *   GET  /v1/usage?days=N               this device's usage (Bearer)
 *   GET  /v1/client-config              public desktop config (latest version, download URL)
 *
 * NOTE: the API has NO registration endpoint (registration happens through
 * PocketBase directly) and NO billing/subscription routes (see INTEGRATION.md).
 */

import "server-only";
import { readString } from "@/lib/env-helpers";

export const endpoints = {
  authConfig: () => readString("DEVORA_API_AUTH_CONFIG_PATH") ?? "/v1/auth/config",
  authSession: () => readString("DEVORA_API_AUTH_SESSION_PATH") ?? "/v1/auth/session",
  authRefresh: () => readString("DEVORA_API_AUTH_REFRESH_PATH") ?? "/v1/auth/refresh",
  authLogout: () => readString("DEVORA_API_AUTH_LOGOUT_PATH") ?? "/v1/auth/logout",
  passwordReset: () => readString("DEVORA_API_PASSWORD_RESET_PATH") ?? "/v1/auth/password-reset",
  account: () => readString("DEVORA_API_ACCOUNT_PATH") ?? "/v1/account",
  usage: () => readString("DEVORA_API_USAGE_PATH") ?? "/v1/usage",
  clientConfig: () => readString("DEVORA_API_CLIENT_CONFIG_PATH") ?? "/v1/client-config",
  announcements: () => readString("DEVORA_API_ANNOUNCEMENTS_PATH") ?? "/v1/announcements",
  deviceSignOut: (deviceId: string) =>
    `/v1/account/devices/${encodeURIComponent(deviceId)}/sign-out`,
};
