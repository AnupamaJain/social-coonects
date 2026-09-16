import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, TrendingUp } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { describeWeights, getWeights, MIN_SAMPLES } from "@/lib/predictor";
import { getPlatform } from "@/lib/platforms/registry";
import { PageBody, PageHeader } from "@/components/page-header";
import { BarList, CalibrationChart, TrendChart } from "@/components/charts";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { bandColor } from "@/components/score";
import { formatNumber } from "@/lib/utils";
import { RefreshButton } from "./refresh-button";

export const metadata: Metadata = { title: "Analytics" };

/** Hoisted out of the component body: calling Date.now() during render is impure. */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const { workspace } = await requireWorkspace();

  const windowDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const since = daysAgo(windowDays);

  const [targets, weights] = await Promise.all([
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
      orderBy: { publishedAt: "desc" },
    }),
    getWeights(workspace.id),
  ]);

  const withMetrics = targets.filter((t) => t.metrics[0]);

  const totals = withMetrics.reduce(
    (acc, t) => {
      const m = t.metrics[0];
      acc.impressions += m.impressions;
      acc.likes += m.likes;
      acc.comments += m.comments;
      acc.shares += m.shares;
      acc.clicks += m.clicks;
      return acc;
    },
    { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 },
  );
  const engagements = totals.likes + totals.comments + totals.shares;
  const engagementRate = totals.impressions
    ? (engagements / totals.impressions) * 100
    : 0;

  // Daily reach series
  const byDay = new Map<string, number>();
  for (let i = windowDays - 1; i >= 0; i--) {
    byDay.set(daysAgo(i).toISOString().slice(0, 10), 0);
  }
  for (const t of withMetrics) {
    const key = t.publishedAt!.toISOString().slice(0, 10);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + t.metrics[0].impressions);
    }
  }
  const trend = [...byDay.entries()].map(([date, value]) => ({ date, value }));

  // Per-platform
  const platformTotals = new Map<string, { reach: number; eng: number; posts: number }>();
  for (const t of withMetrics) {
    const m = t.metrics[0];
    const cur = platformTotals.get(t.account.platform) ?? { reach: 0, eng: 0, posts: 0 };
    cur.reach += m.impressions;
    cur.eng += m.likes + m.comments + m.shares;
    cur.posts += 1;
    platformTotals.set(t.account.platform, cur);
  }
  const platformData = [...platformTotals.entries()]
    .sort((a, b) => b[1].reach - a[1].reach)
    .map(([platform, v]) => ({
      label: getPlatform(platform).name,
      value: v.reach,
      sub: `${v.posts} post${v.posts === 1 ? "" : "s"} · ${formatNumber(v.eng)} engagements · ${
        v.reach ? ((v.eng / v.reach) * 100).toFixed(1) : "0.0"
      }% rate`,
    }));

  // Calibration: predicted score vs actual engagement percentile
  const scored = withMetrics
    .map((t) => {
      const score = t.post.scores.find(
        (s) => s.platform === t.account.platform,
      )?.predicted;
      if (!score) return null;
      const m = t.metrics[0];
      return {
        predicted: score,
        rate: m.impressions ? (m.likes + m.comments * 3 + m.shares * 4) / m.impressions : 0,
        label: t.post.body ? "" : "",
        body: (t.post as { body?: string }).body ?? "",
      };
    })
    .filter(Boolean) as { predicted: number; rate: number; body: string }[];

  const sortedRates = [...scored].sort((a, b) => a.rate - b.rate);
  const calibration = scored.map((s) => ({
    predicted: s.predicted,
    actual: sortedRates.length > 1
      ? Math.round((sortedRates.findIndex((x) => x.rate === s.rate) / (sortedRates.length - 1)) * 100)
      : 50,
    label: s.body.slice(0, 90),
  }));

  const topPosts = [...withMetrics]
    .sort((a, b) => b.metrics[0].impressions - a.metrics[0].impressions)
    .slice(0, 8);

  const learned = describeWeights(weights.weights);

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`Last ${windowDays} days across every connected account.`}
        action={
          <>
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <Link
                  key={d}
                  href={`/app/analytics?days=${d}`}
                  className={`surface rounded-lg px-3 py-2 text-sm ${
                    d === windowDays ? "font-medium" : "text-muted"
                  }`}
                >
                  {d}d
                </Link>
              ))}
            </div>
            <RefreshButton />
          </>
        }
      />

      <PageBody>
        {withMetrics.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TrendingUp className="size-8" />}
              title="No analytics yet"
              description="Publish a post, then hit Refresh. Sandbox accounts generate plausible numbers so you can see the whole loop before going live."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Reach" value={formatNumber(totals.impressions)} sub={`${withMetrics.length} posts`} />
              <Stat label="Engagements" value={formatNumber(engagements)} sub={`${formatNumber(totals.likes)} likes · ${formatNumber(totals.comments)} comments`} />
              <Stat label="Engagement rate" value={`${engagementRate.toFixed(2)}%`} sub="of everyone reached" />
              <Stat label="Link clicks" value={formatNumber(totals.clicks)} sub="where the platform reports them" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card className="p-5">
                <h2 className="font-semibold tracking-tight">Reach per day</h2>
                <p className="mt-1 text-sm text-muted">
                  Impressions on the day each post went out.
                </p>
                <div className="mt-4">
                  <TrendChart data={trend} label="Reach" />
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="font-semibold tracking-tight">By platform</h2>
                <p className="mt-1 text-sm text-muted">Reach, with engagement rate underneath.</p>
                <div className="mt-5">
                  <BarList data={platformData} />
                </div>
              </Card>
            </div>

            {/* The USP, held to account */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <Gauge className="size-4 text-brand-500" />
                  <h2 className="font-semibold tracking-tight">Is the score working?</h2>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Each dot is a published post: what we predicted against where it
                  actually landed. The closer to the dashed line, the better
                  calibrated your predictor is.
                </p>
                <div className="mt-4">
                  <CalibrationChart data={calibration} />
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold tracking-tight">What your audience rewards</h2>
                  {weights.trained ? (
                    <Badge tone="success">Trained</Badge>
                  ) : (
                    <Badge tone="warning">Default weights</Badge>
                  )}
                </div>

                {weights.trained ? (
                  <p className="mt-1 text-sm text-muted">
                    Refit from {weights.samples} published posts. The delta shows
                    how far your audience differs from the generic rubric.
                  </p>
                ) : (
                  <Alert tone="info" className="mt-3">
                    {MIN_SAMPLES - weights.samples} more published posts and these
                    weights get refit against your own engagement data.
                  </Alert>
                )}

                <div className="viz-root mt-5 space-y-3.5">
                  {learned.map((w) => (
                    <div key={w.key} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm">{w.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full border bg-[var(--bg-subtle)]">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.max(2, w.share * 2.6)}%`,
                            background: "var(--seq)",
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums">
                        {w.share}%
                      </span>
                      {weights.trained ? (
                        <span
                          className={`w-9 shrink-0 text-right text-xs tabular-nums ${
                            w.delta > 0 ? "text-emerald-500" : w.delta < 0 ? "text-muted" : "text-muted"
                          }`}
                        >
                          {w.delta > 0 ? `+${w.delta}` : w.delta}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Table view — also the relief for the light-mode contrast warning */}
            <Card className="p-0">
              <div className="p-5 pb-3">
                <h2 className="font-semibold tracking-tight">Top posts</h2>
              </div>
              <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-5 py-2.5 font-medium">Post</th>
                      <th className="px-3 py-2.5 font-medium">Platform</th>
                      <th className="px-3 py-2.5 text-right font-medium">Score</th>
                      <th className="px-3 py-2.5 text-right font-medium">Reach</th>
                      <th className="px-5 py-2.5 text-right font-medium">Eng.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((t) => {
                      const m = t.metrics[0];
                      const score = t.post.scores.find(
                        (s) => s.platform === t.account.platform,
                      )?.predicted;
                      return (
                        <tr key={t.id} className="border-b last:border-b-0">
                          <td className="max-w-md px-5 py-3">
                            <Link
                              href={`/app/compose?post=${t.postId}`}
                              className="line-clamp-2 hover:underline"
                            >
                              {(t.post as { body?: string }).body}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">
                            {getPlatform(t.account.platform).name}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {score ? (
                              <span
                                className="font-semibold tabular-nums"
                                style={{ color: bandColor(score) }}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {formatNumber(m.impressions)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {formatNumber(m.likes + m.comments + m.shares)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}
