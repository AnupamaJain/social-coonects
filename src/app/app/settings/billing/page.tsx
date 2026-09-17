import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PLANS, planFor, stripeEnabled } from "@/lib/billing";
import { PageBody, PageHeader } from "@/components/page-header";
import { Alert, Badge, Card } from "@/components/ui";
import { BillingActions } from "./billing-actions";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const user = await requireUser();
  const plan = planFor(user.plan);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Stripe test mode. Use card 4242 4242 4242 4242 with any future expiry and CVC."
        action={<Badge tone={plan.id === "pro" ? "success" : "neutral"}>{plan.name}</Badge>}
      />

      <PageBody>
        <div className="max-w-3xl space-y-6">
          {checkout === "success" ? (
            <Alert tone="success">
              Payment received. If your plan still shows Starter, the webhook
              hasn&apos;t landed yet — run{" "}
              <code className="font-mono text-xs">stripe listen --forward-to localhost:3000/api/stripe/webhook</code>{" "}
              in another terminal.
            </Alert>
          ) : null}
          {checkout === "cancelled" ? (
            <Alert tone="info">Checkout cancelled. Nothing was charged.</Alert>
          ) : null}

          {!stripeEnabled() ? (
            <Alert tone="warning">
              <strong>Stripe isn&apos;t configured.</strong> Add{" "}
              <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>,{" "}
              <code className="font-mono text-xs">STRIPE_PRICE_ID</code> and{" "}
              <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</code> to{" "}
              <code className="font-mono text-xs">.env.local</code>. See the
              README for the exact test-mode steps.
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.values(PLANS).map((p) => {
              const current = p.id === plan.id;
              return (
                <Card
                  key={p.id}
                  className={`p-5 ${current ? "border-clay-500/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{p.name}</h2>
                    {current ? <Badge tone="brand">Current</Badge> : null}
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">${p.price}</span>
                    <span className="text-sm text-muted">/month</span>
                  </p>
                  <ul className="mt-5 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-clay-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          <BillingActions
            plan={plan.id}
            hasCustomer={Boolean(user.stripeCustomerId)}
            enabled={stripeEnabled()}
          />

          {user.stripeStatus ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Subscription</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd>{user.stripeStatus}</dd>
                </div>
                {user.currentPeriodEnd ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Renews</dt>
                    <dd>{user.currentPeriodEnd.toLocaleDateString()}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
