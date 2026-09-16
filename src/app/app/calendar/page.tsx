import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextQueueSlot } from "@/lib/posts";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PostRow } from "./post-row";

export const metadata: Metadata = { title: "Calendar" };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const { workspace } = await requireWorkspace();

  // `m` is an offset in months from the current one — keeps URLs tiny.
  const offset = Number(m ?? 0) || 0;
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + offset);
  cursor.setHours(0, 0, 0, 0);

  const monthStart = new Date(cursor);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

  // Pad to whole weeks so the grid is always rectangular.
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridDays = Math.ceil(
    (monthEnd.getTime() - gridStart.getTime()) / 86_400_000 / 7,
  ) * 7;

  const [posts, drafts, slots, upcoming, nextSlot] = await Promise.all([
    db.post.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { scheduledAt: { gte: gridStart, lt: new Date(gridStart.getTime() + gridDays * 86_400_000) } },
          { publishedAt: { gte: gridStart, lt: new Date(gridStart.getTime() + gridDays * 86_400_000) } },
        ],
      },
      include: { targets: { include: { account: true } }, scores: true },
      orderBy: { scheduledAt: "asc" },
    }),
    db.post.findMany({
      where: { workspaceId: workspace.id, status: { in: ["draft", "needs_approval"] } },
      include: { targets: { include: { account: true } }, scores: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.queueSlot.findMany({ where: { workspaceId: workspace.id } }),
    db.post.findMany({
      where: { workspaceId: workspace.id, status: "scheduled" },
      include: { targets: { include: { account: true } }, scores: true },
      orderBy: { scheduledAt: "asc" },
      take: 12,
    }),
    nextQueueSlot(workspace.id),
  ]);

  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    const when = p.scheduledAt ?? p.publishedAt;
    if (!when) continue;
    const key = when.toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }

  const slotsByDay = new Map<number, typeof slots>();
  for (const s of slots) {
    slotsByDay.set(s.dayOfWeek, [...(slotsByDay.get(s.dayOfWeek) ?? []), s]);
  }

  const today = new Date().toDateString();

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          nextSlot
            ? `Next free queue slot: ${nextSlot.toLocaleString(undefined, { weekday: "long", hour: "2-digit", minute: "2-digit" })}`
            : "No queue slots configured yet — add a cadence in Settings."
        }
        action={
          <ButtonLink href="/app/compose">
            <PenLine className="size-4" /> Compose
          </ButtonLink>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-1">
                <Link
                  href={`/app/calendar?m=${offset - 1}`}
                  aria-label="Previous month"
                  className="surface grid size-8 place-items-center rounded-lg hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronLeft className="size-4" />
                </Link>
                <Link
                  href="/app/calendar"
                  className="surface rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--bg-subtle)]"
                >
                  Today
                </Link>
                <Link
                  href={`/app/calendar?m=${offset + 1}`}
                  aria-label="Next month"
                  className="surface grid size-8 place-items-center rounded-lg hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Month grid */}
            <Card className="overflow-hidden p-0">
              <div className="grid grid-cols-7 border-b bg-[var(--bg-subtle)]">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: gridDays }, (_, i) => {
                  const day = new Date(gridStart);
                  day.setDate(day.getDate() + i);
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const dayPosts = byDay.get(day.toDateString()) ?? [];
                  const daySlots = slotsByDay.get(day.getDay()) ?? [];
                  const isToday = day.toDateString() === today;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-24 border-b border-r p-1.5 last-of-type:border-r-0 sm:min-h-28",
                        !inMonth && "bg-[var(--bg-subtle)]/60",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full text-xs tabular-nums",
                            isToday
                              ? "bg-brand-600 font-semibold text-white"
                              : inMonth
                                ? ""
                                : "text-muted",
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {daySlots.length > 0 && dayPosts.length === 0 && inMonth ? (
                          <span
                            className="text-[10px] text-muted"
                            title={`${daySlots.length} free slot${daySlots.length === 1 ? "" : "s"}`}
                          >
                            {daySlots.length} free
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 space-y-1">
                        {dayPosts.slice(0, 3).map((p) => {
                          const score = p.scores[0]?.predicted ?? 0;
                          return (
                            <Link
                              key={p.id}
                              href={`/app/compose?post=${p.id}`}
                              title={p.body.slice(0, 120)}
                              className={cn(
                                "block truncate rounded px-1.5 py-1 text-[11px] leading-tight transition-colors",
                                p.status === "published"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : p.status === "failed"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 dark:text-brand-300",
                              )}
                            >
                              <span className="mr-1 font-mono opacity-70">
                                {(p.scheduledAt ?? p.publishedAt)?.toLocaleTimeString(undefined, {
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                              {score ? <span className="mr-1 font-semibold">{score}</span> : null}
                              {p.body.slice(0, 40)}
                            </Link>
                          );
                        })}
                        {dayPosts.length > 3 ? (
                          <p className="px-1.5 text-[10px] text-muted">
                            +{dayPosts.length - 3} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Queue + drafts */}
          <div className="space-y-6">
            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="font-semibold tracking-tight">Queue</h2>
                <Badge>{upcoming.length}</Badge>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="size-7" />}
                  title="Queue is empty"
                  description="Approve a draft and it drops into your next slot."
                />
              ) : (
                <ul className="divide-y border-t">
                  {upcoming.map((p) => (
                    <PostRow
                      key={p.id}
                      post={{
                        id: p.id,
                        body: p.body,
                        status: p.status,
                        scheduledAt: p.scheduledAt?.toISOString() ?? null,
                        score: p.scores[0]?.predicted ?? null,
                        platforms: p.targets.map((t) => t.account.platform),
                      }}
                    />
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="font-semibold tracking-tight">Drafts</h2>
                <Badge>{drafts.length}</Badge>
              </div>
              {drafts.length === 0 ? (
                <EmptyState title="No drafts" description="Everything is scheduled or published." />
              ) : (
                <ul className="divide-y border-t">
                  {drafts.map((p) => (
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
        </div>
      </PageBody>
    </>
  );
}

