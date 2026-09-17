import { type VercelConfig } from "@vercel/config/v1";

/**
 * Cron schedules.
 *
 * Vercel's Hobby plan allows at most one cron run per day, which is useless for
 * a scheduler — so the defaults here are Hobby-compatible and the *real*
 * scheduling is driven externally by .github/workflows/scheduler.yml, which
 * hits the same endpoints every 5 minutes for free.
 *
 * On Pro, set CRON_FREQUENT=1 in the project's environment to switch these to
 * 5-minute publishing and 6-hourly metrics, and delete the workflow.
 *
 * Both paths are idempotent: publishDuePosts only picks up posts whose
 * scheduled time has already passed, so an overlap between the two publishes
 * nothing twice.
 */
const frequent = process.env.CRON_FREQUENT === "1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
  crons: [
    {
      path: "/api/cron/publish",
      schedule: frequent ? "*/5 * * * *" : "0 9 * * *",
    },
    {
      path: "/api/cron/metrics",
      schedule: frequent ? "0 */6 * * *" : "30 9 * * *",
    },
  ],
};

export default config;
