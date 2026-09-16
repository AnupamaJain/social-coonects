import "server-only";

/**
 * Cron routes are publicly routable, so they authenticate.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * CRON_SECRET is set on the project. Locally, the worker sends the same header.
 * If CRON_SECRET is unset we allow it only outside production, so a forgotten
 * secret can't silently leave a public publish endpoint open in prod.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
