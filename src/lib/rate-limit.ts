/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Suitable for a single-instance deployment. Deliberately conservative:
 * protects auth/support endpoints from obvious abuse without any external
 * infrastructure.
 */

const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  // Opportunistic cleanup to keep memory bounded.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, stamps] of buckets) {
      if (!stamps.some((t) => now - t < windowMs)) buckets.delete(k);
      if (buckets.size <= MAX_BUCKETS / 2) break;
    }
  }

  const stamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    const oldest = stamps[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }
  stamps.push(now);
  buckets.set(key, stamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client identity for rate limiting (IP + route key). */
export function rateLimitKey(route: string, ip: string | null): string {
  return `${route}:${ip ?? "unknown"}`;
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}
