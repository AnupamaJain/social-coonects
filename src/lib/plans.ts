/**
 * Plan definitions. Deliberately free of `server-only` and of the Stripe SDK:
 * this is pure data, and the landing page's ROI model needs it in the browser.
 * Anything that talks to Stripe lives in billing.ts, which is server-only.
 */
export const PLANS = {
  free: {
    id: "free" as const,
    name: "Starter",
    price: 0,
    maxAccounts: 2,
    maxScheduled: 10,
    maxAiRunsPerDay: 5,
    autopilot: false,
    features: [
      "2 connected accounts",
      "10 scheduled posts",
      "Voice Fingerprint (1 profile)",
      "Pre-flight scoring",
      "5 AI generations a day",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    price: 29,
    maxAccounts: 25,
    maxScheduled: 10_000,
    maxAiRunsPerDay: 1_000,
    autopilot: true,
    features: [
      "25 connected accounts",
      "Unlimited scheduling",
      "Autopilot queue — a week of drafts, always ready",
      "Predictor retrained on your own analytics",
      "Unlimited AI generations",
      "Multiple brands / clients",
    ],
  },
};

export type PlanId = keyof typeof PLANS;

export const planFor = (plan: string | null | undefined) =>
  PLANS[(plan as PlanId) ?? "free"] ?? PLANS.free;
