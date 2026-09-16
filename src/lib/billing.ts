import "server-only";
import Stripe from "stripe";
import { appUrl } from "./platforms/oauth";

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

export const stripeEnabled = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

let cached: Stripe | null = null;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  cached ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return cached;
}

export async function createCheckoutSession(user: {
  id: string;
  email: string;
  stripeCustomerId: string | null;
}) {
  const stripe = getStripe();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: appUrl("/app/settings/billing?checkout=success"),
    cancel_url: appUrl("/app/settings/billing?checkout=cancelled"),
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
  });

  return { url: session.url, customerId };
}

export async function createPortalSession(customerId: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl("/app/settings/billing"),
  });
  return session.url;
}
