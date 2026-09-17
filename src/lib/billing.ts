import "server-only";
import Stripe from "stripe";
import { appUrl } from "./platforms/oauth";

// Plans live in plans.ts so the browser can read them without pulling in
// `server-only` or the Stripe SDK. Re-exported here so existing imports of
// `@/lib/billing` keep working.
export { PLANS, planFor, type PlanId } from "./plans";

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
