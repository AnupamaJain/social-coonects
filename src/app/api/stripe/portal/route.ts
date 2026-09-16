import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPortalSession, stripeEnabled } from "@/lib/billing";

export async function POST() {
  const user = await requireUser();

  if (!stripeEnabled() || !user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on this account yet." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ url: await createPortalSession(user.stripeCustomerId) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
