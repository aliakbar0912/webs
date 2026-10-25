/**
 * Server-side environment access.
 *
 * Rules enforced here:
 * - This module is server-only. Any import from client code fails the build.
 * - Secrets are never exported to the client bundle (no NEXT_PUBLIC_* here).
 * - Missing configuration never crashes the app: callers receive `undefined`
 *   and must surface honest "not configured" states instead.
 */

function readString(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBool(key: string, fallback: boolean): boolean {
  const value = readString(key);
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

let cachedBase: URL | null | undefined;

/** Parsed, validated upstream API origin. `null` when misconfigured. */
export function apiBaseUrl(): URL | null {
  if (cachedBase !== undefined) return cachedBase;
  const raw = readString("DEVORA_API_BASE_URL") ?? "https://saas.mughalx.tech";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      console.error(
        JSON.stringify({
          scope: "env",
          message: "DEVORA_API_BASE_URL must use https",
        })
      );
      cachedBase = null;
      return cachedBase;
    }
    cachedBase = url;
  } catch {
    console.error(
      JSON.stringify({ scope: "env", message: "DEVORA_API_BASE_URL is not a valid URL" })
    );
    cachedBase = null;
  }
  return cachedBase;
}

export const serverEnv = {
  apiBaseUrl,
  apiKey: () => readString("DEVORA_SERVER_API_KEY"),
  sessionSecret: () => readString("SESSION_SECRET"),
  releaseManifestUrl: () => readString("DEVORA_RELEASE_MANIFEST_URL"),
  supportWebhookUrl: () => readString("SUPPORT_WEBHOOK_URL"),

  billing: {
    /** Master switch: purchase flows stay honestly disabled until Paddle is approved. */
    enabled: () => readBool("NEXT_PUBLIC_BILLING_ENABLED", false),
    environment: () => (readString("PADDLE_ENV") === "live" ? "live" as const : "sandbox" as const),
    apiKey: () => readString("PADDLE_API_KEY"),
    webhookSecret: () => readString("PADDLE_WEBHOOK_SECRET"),
    clientSideToken: () => readString("PADDLE_CLIENT_SIDE_TOKEN"),
    proMonthlyPriceId: () => readString("PADDLE_PRO_MONTHLY_PRICE_ID"),
    proAnnualPriceId: () => readString("PADDLE_PRO_ANNUAL_PRICE_ID"),
  },

  /**
   * PocketBase storage service (the SAME PocketBase that owns Devora
   * identities — the admin API's account store). When configured, the
   * website stores its operational data (support messages, Paddle webhook
   * audit events, published pricing plans) in dedicated `website_*`
   * collections there instead of the local SQLite fallback. Credentials
   * belong to a DEDICATED PocketBase superuser for the website and are
   * never logged or sent to the client.
   */
  pb: {
    url: () => readString("DEVORA_PB_URL"),
    adminEmail: () => readString("DEVORA_PB_ADMIN_EMAIL"),
    adminPassword: () => readString("DEVORA_PB_ADMIN_PASSWORD"),
    usersCollection: () => readString("DEVORA_PB_USERS_COLLECTION") ?? "users",
    pricingCollection: () => readString("DEVORA_PB_PRICING_COLLECTION") ?? "website_pricing",
    supportCollection: () => readString("DEVORA_PB_SUPPORT_COLLECTION") ?? "website_support_messages",
    webhookEventsCollection: () => readString("DEVORA_PB_WEBHOOKS_COLLECTION") ?? "website_webhook_events",
  },

  isProduction: () => process.env.NODE_ENV === "production",
};
