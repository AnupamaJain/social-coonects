/**
 * Canonical site facts, shared by metadata, structured data, sitemap and
 * llms.txt so they can never disagree with each other.
 */
export const siteUrl = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE = {
  name: "Sixfold",
  title: "Sixfold — AI social media scheduler that writes in your voice and scores posts before you publish",
  shortTitle: "Sixfold — post in your voice, know how it'll do",
  description:
    "Schedule posts to X, LinkedIn, Instagram, Facebook, Threads and Mastodon from one composer. Sixfold learns how you write, scores every draft before it goes out, and keeps a week of approved content in the queue.",
  keywords: [
    "social media scheduler", "AI social media scheduler", "schedule LinkedIn posts",
    "schedule posts to X", "Instagram scheduler", "social media content calendar",
    "AI post generator in your voice", "social media post scoring", "Postiz alternative",
    "Buffer alternative", "Hootsuite alternative", "content queue", "LinkedIn post analyzer",
  ],
  category: "Social media management software",
  founded: "2026",
  pricing: { free: 0, pro: 29, currency: "USD" },
} as const;
