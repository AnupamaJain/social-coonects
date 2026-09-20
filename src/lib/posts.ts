import "server-only";
import { db, readJson, writeJson } from "./db";
import { withTokens } from "./accounts";
import { normaliseMedia } from "./media";
import { publishToPlatform } from "./platforms/publish";
import { fetchMetrics } from "./platforms/metrics";
import { getWeights } from "./predictor";
import { scorePost } from "./scoring";
import { getVoiceContext } from "./voice";
import type { PlatformId } from "./platforms/types";

export const POST_STATUSES = [
  "draft", "needs_approval", "scheduled", "publishing", "published", "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * The next free publishing slot for this workspace.
 *
 * Queue-first scheduling is the point: you approve a draft, it lands in the
 * next slot your cadence already defines, and you never pick a datetime.
 */
export async function nextQueueSlot(
  workspaceId: string,
  after = new Date(),
): Promise<Date | null> {
  const slots = await db.queueSlot.findMany({ where: { workspaceId } });
  if (!slots.length) return null;

  const taken = new Set(
    (
      await db.post.findMany({
        where: {
          workspaceId,
          scheduledAt: { gte: after },
          status: { in: ["scheduled", "publishing"] },
        },
        select: { scheduledAt: true },
      })
    ).map((p) => p.scheduledAt!.toISOString()),
  );

  // Walk forward day by day; 8 weeks is plenty of runway for any cadence.
  for (let dayOffset = 0; dayOffset < 56; dayOffset++) {
    const day = new Date(after);
    day.setDate(day.getDate() + dayOffset);
    const dow = day.getDay();

    const todays = slots
      .filter((s) => s.dayOfWeek === dow)
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    for (const slot of todays) {
      const when = new Date(day);
      when.setHours(slot.hour, slot.minute, 0, 0);
      if (when <= after) continue;
      if (taken.has(when.toISOString())) continue;
      return when;
    }
  }
  return null;
}

/** Scores a post for every platform it targets and persists the result. */
export async function rescorePost(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { targets: { include: { account: true } } },
  });
  if (!post) return [];

  const [{ context, traits }, { weights }] = await Promise.all([
    getVoiceContext(post.workspaceId),
    getWeights(post.workspaceId),
  ]);

  const byPlatform = new Map<PlatformId, string>();
  for (const t of post.targets) {
    byPlatform.set(t.account.platform as PlatformId, t.override ?? post.body);
  }
  if (!byPlatform.size) byPlatform.set("linkedin", post.body);

  const results = [];
  for (const [platform, text] of byPlatform) {
    const s = scorePost(text, platform, {
      traits,
      dontList: context?.dontList ?? [],
      weights,
    });
    await db.postScore.upsert({
      where: { postId_platform: { postId, platform } },
      create: {
        postId, platform,
        voiceMatch: s.voiceMatch, hook: s.hook, readability: s.readability,
        cta: s.cta, lengthFit: s.lengthFit, algoRisk: s.algoRisk,
        predicted: s.predicted,
        rationale: writeJson({ signals: s.signals, suggestions: s.suggestions }),
      },
      update: {
        voiceMatch: s.voiceMatch, hook: s.hook, readability: s.readability,
        cta: s.cta, lengthFit: s.lengthFit, algoRisk: s.algoRisk,
        predicted: s.predicted,
        rationale: writeJson({ signals: s.signals, suggestions: s.suggestions }),
      },
    });
    results.push(s);
  }
  return results;
}

/** Publishes one post to all of its targets. Partial failure is survivable. */
export async function publishPost(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { targets: { include: { account: true } } },
  });
  if (!post) throw new Error("Post not found");
  if (!post.targets.length) throw new Error("This post has no connected accounts selected.");

  await db.post.update({ where: { id: postId }, data: { status: "publishing" } });
  const media = normaliseMedia(readJson<unknown[]>(post.mediaUrls, []));

  const outcomes = await Promise.all(
    post.targets.map(async (target) => {
      try {
        const result = await publishToPlatform(withTokens(target.account), {
          text: target.override ?? post.body,
          media,
        });
        await db.postTarget.update({
          where: { id: target.id },
          data: {
            status: "published",
            remoteId: result.remoteId,
            remoteUrl: result.remoteUrl,
            error: null,
            publishedAt: new Date(),
          },
        });
        return { ok: true as const, platform: target.account.platform };
      } catch (err) {
        await db.postTarget.update({
          where: { id: target.id },
          data: { status: "failed", error: (err as Error).message.slice(0, 500) },
        });
        return { ok: false as const, platform: target.account.platform, error: (err as Error).message };
      }
    }),
  );

  const anySuccess = outcomes.some((o) => o.ok);
  await db.post.update({
    where: { id: postId },
    data: {
      status: anySuccess ? "published" : "failed",
      publishedAt: anySuccess ? new Date() : null,
    },
  });

  return outcomes;
}

/** Called by the cron route and the local worker. */
export async function publishDuePosts(now = new Date()) {
  const due = await db.post.findMany({
    where: { status: "scheduled", scheduledAt: { lte: now } },
    select: { id: true },
    take: 25,
  });

  const results = [];
  for (const { id } of due) {
    try {
      results.push({ id, outcomes: await publishPost(id) });
    } catch (err) {
      await db.post.update({ where: { id }, data: { status: "failed" } });
      results.push({ id, error: (err as Error).message });
    }
  }
  return results;
}

/** Re-pulls analytics for recently published targets. */
export async function refreshMetrics(workspaceId?: string, maxAgeDays = 30) {
  const since = new Date(Date.now() - maxAgeDays * 86_400_000);
  const targets = await db.postTarget.findMany({
    where: {
      status: "published",
      publishedAt: { gte: since },
      ...(workspaceId ? { post: { workspaceId } } : {}),
    },
    include: { account: true },
    take: 200,
  });

  for (const target of targets) {
    const metrics = await fetchMetrics({
      ...target,
      account: withTokens(target.account),
    });
    await db.postMetric.create({ data: { postTargetId: target.id, ...metrics } });
  }
  return targets.length;
}
