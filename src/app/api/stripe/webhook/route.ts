import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/billing";

/**
 * Stripe needs the raw body to verify the signature, so this route reads
 * `req.text()` and never `req.json()`.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Stripe retries on any non-2xx and can deliver the same event twice even on
  // success. Recording the id first makes replays a no-op.
  const seen = await db.processedWebhook.findUnique({ where: { id: event.id } });
  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  await db.processedWebhook.create({ data: { id: event.id, type: event.type } });

  const setPlanFromSubscription = async (sub: Stripe.Subscription) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const active = ["active", "trialing", "past_due"].includes(sub.status);
    // The period end moved onto the subscription item in recent API versions.
    const periodEnd =
      (sub as unknown as { current_period_end?: number }).current_period_end ??
      sub.items.data[0]?.current_period_end;

    await db.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan: active ? "pro" : "free",
        stripeSubscriptionId: sub.id,
        stripeStatus: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const userId = session.client_reference_id;
      if (userId && customerId) {
        // First payment: bind the customer to the user and flip the plan now,
        // so the UI updates before the subscription event lands.
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId, plan: "pro", stripeStatus: "active" },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await setPlanFromSubscription(event.data.object);
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
