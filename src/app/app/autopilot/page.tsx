import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { planFor } from "@/lib/billing";
import { aiEnabled } from "@/lib/ai/model";
import { getVoiceContext } from "@/lib/voice";
import { nextQueueSlot } from "@/lib/posts";
import { PageBody, PageHeader } from "@/components/page-header";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { PostRow } from "../calendar/post-row";
import { AutopilotForm } from "./autopilot-form";

export const metadata: Metadata = { title: "Autopilot" };

export default async function AutopilotPage() {
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  const [accounts, pending, voice, slot, campaigns] = await Promise.all([
    db.socialAccount.findMany({
      where: { workspaceId: workspace.id, status: "active" },
      orderBy: { createdAt: "asc" },
    }),
    db.post.findMany({
      where: { workspaceId: workspace.id, status: "needs_approval" },
      include: { targets: { include: { account: true } }, scores: true, campaign: true },
      orderBy: [{ createdAt: "desc" }],
    }),
    getVoiceContext(workspace.id),
    nextQueueSlot(workspace.id),
    db.campaign.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { posts: true } } },
    }),
  ]);

  // Highest-scoring first: approval should start with the best of the batch.
  const ranked = [...pending].sort(
    (a, b) => (b.scores[0]?.predicted ?? 0) - (a.scores[0]?.predicted ?? 0),
  );

  return (
    <>
      <PageHeader
        title="Autopilot"
        description="Give it a topic. It plans a week with an arc, writes each post in your voice, scores them, and waits for your approval."
        action={
          pending.length ? (
            <Badge tone="brand">{pending.length} awaiting approval</Badge>
          ) : undefined
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            {!voice.traits.sampleCount ? (
              <Alert tone="warning">
                Your Voice Fingerprint isn&apos;t trained. Autopilot will still
                write, but it won&apos;t sound like you until you{" "}
                <a href="/app/voice" className="font-medium underline">add samples</a>.
              </Alert>
            ) : null}

            {!aiEnabled() ? (
              <Alert tone="info">
                Offline mode — Autopilot will use the built-in template writer so
                you can see the full flow. Add an AI key for real drafts.
              </Alert>
            ) : null}

            <AutopilotForm
              accounts={accounts.map((a) => ({
                id: a.id,
                platform: a.platform,
                handle: a.handle,
              }))}
              maxCount={plan.autopilot ? 7 : 3}
              planName={plan.name}
              canRunFullWeek={plan.autopilot}
            />

            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <div>
                  <h2 className="font-semibold tracking-tight">Awaiting your approval</h2>
                  <p className="mt-1 text-sm text-muted">
                    Best-scoring first.{" "}
                    {slot
                      ? `Approving drops a post into ${slot.toLocaleString(undefined, {
                          weekday: "short", hour: "2-digit", minute: "2-digit",
                        })}.`
                      : "Add queue slots in Settings to enable one-click queueing."}
                  </p>
                </div>
              </div>

              {ranked.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="size-8" />}
                  title="Nothing waiting"
                  description="Run Autopilot above and a week of drafts lands here, pre-scored."
                />
              ) : (
                <ul className="divide-y border-t">
                  {ranked.map((p) => (
                    <PostRow
                      key={p.id}
                      post={{
                        id: p.id,
                        body: p.body,
                        status: p.status,
                        scheduledAt: null,
                        score: p.scores[0]?.predicted ?? null,
                        platforms: p.targets.map((t) => t.account.platform),
                      }}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="p-5">
              <h2 className="text-sm font-semibold">How it works</h2>
              <ol className="mt-4 space-y-4">
                {[
                  ["Plans the week", "Opinionated opener, a how-it-works piece, a story, a contrarian take, a short close."],
                  ["Writes in your voice", "Every draft is conditioned on your fingerprint, not a generic prompt."],
                  ["Scores before you see it", "Each draft arrives with a predicted score so approval takes seconds."],
                  ["You approve", "Nothing publishes without a human. Approved posts fill your existing cadence."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            {campaigns.length > 0 ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold">Recent runs</h2>
                <ul className="mt-3 space-y-2">
                  {campaigns.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {c._count.posts} posts
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </PageBody>
    </>
  );
}
