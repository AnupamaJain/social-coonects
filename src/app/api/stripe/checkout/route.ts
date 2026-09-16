import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession, stripeEnabled } from "@/lib/billing";
import { appUrl } from "@/lib/platforms/oauth";

export async function POST() {
  const user = await requireUser();

  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: "Stripe isn't configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
      { status: 400 },
    );
  }

  try {
    const { url, customerId } = await createCheckoutSession(user);
    if (customerId !== user.stripeCustomerId) {
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }
    return NextResponse.json({ url: url ?? appUrl("/app/settings/billing") });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
