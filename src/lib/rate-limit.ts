import "server-only";
import { db } from "./db";

/**
 * Fixed-window rate limiting, backed by the database.
 *
 * In-memory counters are useless here: every serverless instance would keep its
 * own, so the real limit becomes (limit × instances). The database is the only
 * thing all instances agree on.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000,
  );
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 1000);

  const record = await db.rateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, expiresAt, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Opportunistic cleanup — cheap, and keeps the table from growing forever
  // without needing a dedicated cron.
  if (Math.random() < 0.01) {
    await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
  );

  return {
    ok: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    retryAfterSeconds,
  };
}

/** Best-effort client IP, for limiting unauthenticated endpoints. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function tooManyRequests(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests. Slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
