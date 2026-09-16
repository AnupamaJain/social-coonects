#!/usr/bin/env node
/**
 * Local scheduler. Vercel Cron runs these same two endpoints in production;
 * this just pokes them on an interval so scheduled posts actually go out while
 * you're developing.
 *
 *   npm run worker
 */
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;
const PUBLISH_EVERY = 30_000;
const METRICS_EVERY = 5 * 60_000;

const headers = SECRET ? { Authorization: `Bearer ${SECRET}` } : {};

async function hit(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[worker] ${path} -> ${res.status}`, body);
      return;
    }
    if (body.processed || body.refreshed) {
      console.log(
        `[worker] ${new Date().toLocaleTimeString()} ${path}`,
        body.processed !== undefined ? `published ${body.processed}` : `refreshed ${body.refreshed}`,
      );
    }
  } catch (err) {
    console.error(`[worker] ${path} failed:`, err.message);
  }
}

console.log(`[worker] watching ${BASE} — publish every ${PUBLISH_EVERY / 1000}s, metrics every ${METRICS_EVERY / 60000}m`);
hit("/api/cron/publish");
hit("/api/cron/metrics");
setInterval(() => hit("/api/cron/publish"), PUBLISH_EVERY);
setInterval(() => hit("/api/cron/metrics"), METRICS_EVERY);
