import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
  crons: [
    // Publishes anything whose scheduled time has passed.
    { path: "/api/cron/publish", schedule: "*/5 * * * *" },
    // Pulls analytics and refits each workspace's predictor.
    { path: "/api/cron/metrics", schedule: "0 */6 * * *" },
  ],
};

export default config;
