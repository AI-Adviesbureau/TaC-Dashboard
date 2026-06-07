/**
 * Eenvoudige in-memory rate limiter (per sleutel, bv. IP-adres).
 * Geschikt voor één server-instance. Voor een schaalbare productie-opzet
 * (meerdere serverless-instances) is een gedeelde store (Redis/Upstash)
 * aan te raden — zie docs/deployment.md.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  if (b.count > opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Reset de teller voor een sleutel (bv. na een succesvolle login). */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}
