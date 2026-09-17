import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { planFor } from "@/lib/billing";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, ButtonLink } from "@/components/ui";
import { QueueEditor } from "./queue-editor";
import { TestimonialsAdmin } from "./testimonials-admin";
import { isAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  const admin = isAdmin(user);
  const testimonials = admin
    ? await db.testimonial.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "desc" }] })
    : [];

  const slots = await db.queueSlot.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }, { minute: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your posting cadence, plan and account."
      />

      <PageBody>
        <div className="max-w-3xl space-y-6">
          <QueueEditor
            slots={slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              hour: s.hour,
              minute: s.minute,
            }))}
          />

          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold tracking-tight">Plan</h2>
                <p className="mt-1 text-sm text-muted">
                  You&apos;re on <strong>{plan.name}</strong> —{" "}
                  {plan.maxAccounts} accounts,{" "}
                  {plan.autopilot ? "full Autopilot" : "limited Autopilot"}.
                </p>
              </div>
              <ButtonLink href="/app/settings/billing" variant="outline">
                <CreditCard className="size-4" /> Billing
              </ButtonLink>
            </div>
          </Card>

          {admin ? (
            <TestimonialsAdmin items={testimonials.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))} />
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Account</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Brand</dt>
                <dd>{workspace.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Member since</dt>
                <dd>{user.createdAt.toLocaleDateString()}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              Need to connect more places to publish?{" "}
              <Link href="/app/accounts" className="text-clay-500 hover:underline">
                Manage accounts
              </Link>
              .
            </p>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
