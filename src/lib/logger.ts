/**
 * Structured server-side logger with mandatory redaction.
 *
 * Never log: passwords, tokens, API keys, license keys, payment details.
 * Values for sensitive keys are replaced before serialization; objects that
 * contain them are scrubbed recursively (depth-limited).
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "webhooksecret",
  "licensekey",
  "license",
  "sessioncookie",
  "cookie",
  "card",
  "paymentmethod",
  "checkouttoken",
]);

const MAX_DEPTH = 4;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return "[truncated]";
  if (typeof value === "string") {
    // Heuristic: never echo long credential-like strings by mistake.
    return value.length > 256 ? `${value.slice(0, 24)}…[redacted ${value.length} chars]` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return "[unloggable]";
}

type Level = "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta: redact(meta) as Record<string, unknown> } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("error", scope, message, meta),
};
