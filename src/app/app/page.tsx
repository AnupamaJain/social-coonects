import Link from "next/link";
import {
  ArrowRight, CalendarClock, Check, Fingerprint, Gauge, Link2,
  PenLine, Sparkles, TrendingUp,
} from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeights, MIN_SAMPLES } from "@/lib/predictor";
import { getVoiceContext } from "@/lib/voice";
import { aiEnabled } from "@/lib/ai/model";
import { getPlatform } from "@/lib/platforms/registry";
import { PageBody, PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/score";
import { Alert, Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

/** Hoisted out of the component body: calling Date.now() during render is impure. */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const since = daysAgo(30);

  const [
    accounts, scheduled, pending, published, samples, weights, voice,
  ] = await Promise.all([
    db.socialAccount.findMany({ where: { workspaceId: workspace.id } }),
    db.post.findMany({
      where: { workspaceId: workspace.id, status: "scheduled" },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { targets: { include: { account: true } }, scores: true },
    }),
    db.post.count({ where: { workspaceId: workspace.id, status: "needs_approval" } }),
    db.postTarget.findMany({
      where: {
        status: "published",
        publishedAt: { gte: since },
        post: { workspaceId: workspace.id },
      },
      include: {
        account: true,
        post: { include: { scores: true } },
        metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      },
    }),
    db.voiceSample.count({ where: { profile: { workspaceId: workspace.id } } }),
    getWeights(workspace.id),
    getVoiceContext(workspace.id),
  ]);

  const reach = published.reduce((a, t) => a + (t.metrics[0]?.impressions ?? 0), 0);
  const engagement = published.reduce(
    (a, t) =>
      a + (t.metrics[0]
        ? t.metrics[0].likes + t.metrics[0].comments + t.metrics[0].shares
        : 0),
    0,
  );
  const scoredPosts = published.flatMap((t) => t.post.scores.map((s) => s.predicted));
  const avgScore = scoredPosts.length
    ? Math.round(scoredPosts.reduce((a, b) => a + b, 0) / scoredPosts.length)
    : 0;

  const steps = [
    {
      done: accounts.length > 0,
      label: "Connect an account",
      href: "/app/accounts",
      icon: Link2,
      hint: "Sandbox mode works with no API keys.",
    },
    {
      done: samples >= 3,
      label: "Train your Voice Fingerprint",
      href: "/app/voice",
      icon: Fingerprint,
      hint: "Paste 5-10 posts you're proud of.",
    },
    {
      done: published.length > 0 || scheduled.length > 0,
      label: "Queue your first post",
      href: "/app/compose",
      icon: PenLine,
      hint: "Write it, score it, queue it.",
    },
  ];
  const setupDone = steps.every((s) => s.done);

  return (
    <>
      <PageHeader
        title={workspace.name}
        description="Queue health, what's coming up, and what the predictor has learned."
        action={
          <>
            <ButtonLink href="/app/autopilot" variant="outline">
              <Sparkles className="size-4" /> Autopilot
            </ButtonLink>
            <ButtonLink href="/app/compose">
              <PenLine className="size-4" /> Compose
            </ButtonLink>
          </>
        }
      />

      <PageBody>
        <div className="space-y-6">
          {!aiEnabled() ? (
            <Alert tone="info">
              <strong>Offline AI mode.</strong> Generation is using the built-in
              template writer. Add <code className="font-mono text-xs">AI_GATEWAY_API_KEY</code>{" "}
              or <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> to{" "}
              <code className="font-mono text-xs">.env.local</code> for model-written drafts.
              Scoring and the Voice Fingerprint work either way.
            </Alert>
          ) : null}

          {!setupDone ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">Finish setting up</h2>
              <p className="mt-1 text-sm text-muted">
                Three steps and the queue runs itself.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {steps.map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className={`group rounded-lg border p-4 transition-colors ${
                      step.done
                        ? "bg-emerald-500/5 border-emerald-500/25"
                        : "hover:border-clay-500/50 hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {step.done ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <step.icon className="size-4 text-clay-500" />
                      )}
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{step.hint}</p>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CalendarClock}
              label="In the queue"
              value={String(scheduled.length)}
              sub={pending ? `${pending} awaiting approval` : "Nothing pending"}
            />
            <StatCard
              icon={TrendingUp}
              label="Reach · 30 days"
              value={formatNumber(reach)}
              sub={`${formatNumber(engagement)} engagements`}
            />
            <StatCard
              icon={Gauge}
              label="Avg predicted score"
              value={avgScore ? String(avgScore) : "—"}
              sub={`${published.length} posts published`}
            />
            <StatCard
              icon={Fingerprint}
              label="Voice fingerprint"
              value={voice.traits.sampleCount ? `${voice.traits.sampleCount}` : "—"}
              sub={
                voice.traits.sampleCount
                  ? `${voice.traits.avgSentenceWords.toFixed(0)} words/sentence`
                  : "Not trained yet"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Upcoming */}
            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="font-semibold tracking-tight">Coming up</h2>
                <Link
                  href="/app/calendar"
                  className="inline-flex items-center gap-1 text-sm text-clay-500 hover:underline"
                >
                  Calendar <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {scheduled.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="size-8" />}
                  title="Nothing scheduled"
                  description="Write a post, or let Autopilot draft a week from one topic."
                  action={
                    <ButtonLink href="/app/autopilot" size="sm" variant="outline">
                      <Sparkles className="size-4" /> Run Autopilot
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="divide-y border-t">
                  {scheduled.map((post) => {
                    const score = post.scores[0]?.predicted ?? 0;
                    return (
                      <li key={post.id}>
                        <Link
                          href={`/app/compose?post=${post.id}`}
                          className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <div className="w-20 shrink-0">
                            <p className="font-mono text-xs text-muted">
                              {post.scheduledAt?.toLocaleDateString(undefined, {
                                weekday: "short", month: "short", day: "numeric",
                              })}
                            </p>
                            <p className="font-mono text-xs font-medium">
                              {post.scheduledAt?.toLocaleTimeString(undefined, {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <p className="min-w-0 flex-1 line-clamp-2 text-sm">
                            {post.body}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {post.targets.slice(0, 3).map((t) => (
                              <span
                                key={t.id}
                                title={getPlatform(t.account.platform).name}
                                className={`size-2 rounded-full ${getPlatform(t.account.platform).accent}`}
                              />
                            ))}
                            {score ? (
                              <Badge tone={score >= 70 ? "success" : "neutral"}>{score}</Badge>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Predictor status — the USP, surfaced */}
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-clay-500" />
                <h2 className="font-semibold tracking-tight">Your predictor</h2>
              </div>

              <div className="mt-5 flex items-center justify-center">
                <ScoreRing
                  score={Math.min(100, (weights.samples / MIN_SAMPLES) * 100)}
                  size={110}
                />
              </div>

              <p className="mt-4 text-center text-sm">
                {weights.trained ? (
                  <>
                    Trained on <strong>{weights.samples}</strong> of your published
                    posts.
                  </>
                ) : (
                  <>
                    <strong>{weights.samples}</strong> of {MIN_SAMPLES} posts
                    collected.
                  </>
                )}
              </p>
              <p className="mt-1 text-center text-xs text-muted">
                {weights.trained
                  ? "Scores are now weighted to your audience, not a generic rubric."
                  : `Publish ${MIN_SAMPLES - weights.samples} more and scoring switches from the default rubric to your own engagement data.`}
              </p>

              <ButtonLink
                href="/app/analytics"
                variant="outline"
                size="sm"
                className="mt-5 w-full"
              >
                See what it learned
              </ButtonLink>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}
