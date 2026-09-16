"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, readJson, writeJson } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { planFor } from "@/lib/billing";
import {
  nextQueueSlot, publishPost, refreshMetrics, rescorePost,
} from "@/lib/posts";
import { trainPredictor } from "@/lib/predictor";
import { retrainVoice, getVoiceProfile, getVoiceContext } from "@/lib/voice";
import { generateWeek } from "@/lib/ai/generate";
import { isPlatformId } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { slugify } from "@/lib/utils";

const bump = () => {
  revalidatePath("/app", "layout");
};

// ---------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------

export interface SaveState {
  error?: string;
}

export async function savePost(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  const postId = (formData.get("postId") as string) || null;
  const body = String(formData.get("body") ?? "").trim();
  const accountIds = formData.getAll("accountIds").map(String).filter(Boolean);
  const intent = String(formData.get("intent") ?? "draft");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const overridesRaw = String(formData.get("overrides") ?? "{}");
  const overrides = readJson<Record<string, string>>(overridesRaw, {});

  if (!body) return { error: "Write something first." };

  if (intent === "schedule" || intent === "queue" || intent === "publish") {
    if (!accountIds.length) {
      return { error: "Pick at least one account to publish to." };
    }
  }

  if (intent === "schedule" || intent === "queue") {
    const scheduledCount = await db.post.count({
      where: { workspaceId: workspace.id, status: "scheduled" },
    });
    if (scheduledCount >= plan.maxScheduled && !postId) {
      return {
        error: `The ${plan.name} plan allows ${plan.maxScheduled} scheduled posts. Upgrade to queue more.`,
      };
    }
  }

  let scheduledAt: Date | null = null;
  if (intent === "queue") {
    scheduledAt = await nextQueueSlot(workspace.id);
    if (!scheduledAt) {
      return { error: "No queue slots configured. Add a posting cadence in Settings." };
    }
  } else if (intent === "schedule") {
    if (!scheduledAtRaw) return { error: "Pick a date and time." };
    scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) return { error: "That date isn't valid." };
  }

  const status =
    intent === "publish" ? "publishing"
    : intent === "queue" || intent === "schedule" ? "scheduled"
    : "draft";

  const post = postId
    ? await db.post.update({
        where: { id: postId },
        data: { body, status, scheduledAt },
      })
    : await db.post.create({
        data: {
          workspaceId: workspace.id,
          body,
          status,
          scheduledAt,
          source: (formData.get("source") as string) || "manual",
        },
      });

  // Reconcile targets with the selected accounts.
  await db.postTarget.deleteMany({
    where: { postId: post.id, accountId: { notIn: accountIds } },
  });
  for (const accountId of accountIds) {
    const override = overrides[accountId]?.trim();
    await db.postTarget.upsert({
      where: { postId_accountId: { postId: post.id, accountId } },
      create: {
        postId: post.id,
        accountId,
        override: override && override !== body ? override : null,
      },
      update: { override: override && override !== body ? override : null },
    });
  }

  await rescorePost(post.id);

  if (intent === "publish") {
    await publishPost(post.id);
  }

  bump();
  redirect(intent === "draft" ? `/app/compose?post=${post.id}&saved=1` : "/app/calendar");
}

export async function approveAndQueue(postId: string) {
  const { workspace } = await requireWorkspace();
  const slot = await nextQueueSlot(workspace.id);
  if (!slot) return { error: "No queue slots configured." };

  await db.post.update({
    where: { id: postId },
    data: { status: "scheduled", scheduledAt: slot },
  });
  bump();
  return { ok: true, scheduledAt: slot.toISOString() };
}

export async function publishNow(postId: string) {
  await requireWorkspace();
  const outcomes = await publishPost(postId);
  bump();
  return { ok: outcomes.some((o) => o.ok), outcomes };
}

export async function unschedulePost(postId: string) {
  await requireWorkspace();
  await db.post.update({
    where: { id: postId },
    data: { status: "draft", scheduledAt: null },
  });
  bump();
}

export async function reschedulePost(postId: string, iso: string) {
  await requireWorkspace();
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return { error: "Invalid date." };
  await db.post.update({
    where: { id: postId },
    data: { status: "scheduled", scheduledAt: when },
  });
  bump();
  return { ok: true };
}

export async function deletePost(postId: string) {
  await requireWorkspace();
  await db.post.delete({ where: { id: postId } });
  bump();
}

// ---------------------------------------------------------------------------
// Voice fingerprint
// ---------------------------------------------------------------------------

export async function addVoiceSamples(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const raw = String(formData.get("samples") ?? "");
  // Blank line + --- is the natural separator when pasting several posts.
  const chunks = raw
    .split(/\n\s*-{3,}\s*\n/)
    .flatMap((c) => (c.includes("\n\n\n") ? c.split(/\n{3,}/) : [c]))
    .map((c) => c.trim())
    .filter((c) => c.length > 40);

  if (!chunks.length) {
    return { error: "Paste at least one post (40+ characters). Separate posts with a line of ---." };
  }

  const profile = await getVoiceProfile(workspace.id);
  await db.voiceSample.createMany({
    data: chunks.map((text) => ({
      voiceProfileId: profile.id,
      text,
      platform: (formData.get("platform") as string) || null,
    })),
  });

  await retrainVoice(workspace.id);
  bump();
  return { ok: true, added: chunks.length };
}

export async function deleteVoiceSample(id: string) {
  const { workspace } = await requireWorkspace();
  await db.voiceSample.delete({ where: { id } });
  await retrainVoice(workspace.id);
  bump();
}

export async function retrainVoiceAction() {
  const { workspace } = await requireWorkspace();
  const result = await retrainVoice(workspace.id);
  bump();
  return { ok: true, offline: result.offline };
}

export async function updateVoiceLists(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const profile = await getVoiceProfile(workspace.id);
  const parse = (key: string) =>
    String(formData.get(key) ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  await db.voiceProfile.update({
    where: { id: profile.id },
    data: {
      doList: writeJson(parse("doList")),
      dontList: writeJson(parse("dontList")),
      summary: String(formData.get("summary") ?? profile.summary),
    },
  });
  bump();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function connectSandboxAccount(platform: string) {
  const { workspace, user } = await requireWorkspace();
  if (!isPlatformId(platform)) return { error: "Unknown platform." };

  const plan = planFor(user.plan);
  const count = await db.socialAccount.count({ where: { workspaceId: workspace.id } });
  if (count >= plan.maxAccounts) {
    return {
      error: `The ${plan.name} plan allows ${plan.maxAccounts} connected accounts. Upgrade for more.`,
    };
  }

  const handle = `@${slugify(workspace.name)}`;
  await db.socialAccount.upsert({
    where: {
      workspaceId_platform_platformUserId: {
        workspaceId: workspace.id,
        platform,
        platformUserId: `sandbox-${workspace.id}`,
      },
    },
    create: {
      workspaceId: workspace.id,
      platform,
      platformUserId: `sandbox-${workspace.id}`,
      handle,
      displayName: workspace.name,
      isSandbox: true,
    },
    update: { status: "active" },
  });

  bump();
  return { ok: true };
}

export async function disconnectAccount(accountId: string) {
  await requireWorkspace();
  await db.socialAccount.delete({ where: { id: accountId } });
  bump();
}

// ---------------------------------------------------------------------------
// Queue cadence
// ---------------------------------------------------------------------------

export async function updateQueueSlots(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const slots = formData
    .getAll("slot")
    .map(String)
    .map((value) => {
      // value format: "dayOfWeek:HH:MM"
      const [dow, hour, minute] = value.split(":").map(Number);
      return { dayOfWeek: dow, hour, minute: minute || 0 };
    })
    .filter(
      (s) =>
        Number.isInteger(s.dayOfWeek) && s.dayOfWeek >= 0 && s.dayOfWeek <= 6 &&
        Number.isInteger(s.hour) && s.hour >= 0 && s.hour <= 23,
    );

  // SQLite has no skipDuplicates, so dedupe here: the slot is unique per
  // (workspace, day, hour, minute) and a duplicate in the form is user error,
  // not a reason to fail the save.
  const unique = [
    ...new Map(
      slots.map((s) => [`${s.dayOfWeek}:${s.hour}:${s.minute}`, s]),
    ).values(),
  ];

  await db.queueSlot.deleteMany({ where: { workspaceId: workspace.id } });
  if (unique.length) {
    await db.queueSlot.createMany({
      data: unique.map((s) => ({ ...s, workspaceId: workspace.id })),
    });
  }
  bump();
  return { ok: true, count: unique.length };
}

// ---------------------------------------------------------------------------
// Analytics + predictor
// ---------------------------------------------------------------------------

export async function refreshAnalytics() {
  const { workspace } = await requireWorkspace();
  const count = await refreshMetrics(workspace.id);
  const training = await trainPredictor(workspace.id);
  bump();
  return { ok: true, refreshed: count, ...training };
}

// ---------------------------------------------------------------------------
// Autopilot — a week of drafts in one action
// ---------------------------------------------------------------------------

export async function runAutopilot(formData: FormData) {
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  const topic = String(formData.get("topic") ?? "").trim();
  const platforms = formData
    .getAll("platforms")
    .map(String)
    .filter(isPlatformId) as PlatformId[];
  const accountIds = formData.getAll("accountIds").map(String).filter(Boolean);
  const count = Math.min(7, Math.max(1, Number(formData.get("count") ?? 5)));

  if (!topic) return { error: "Give it a topic to work from." };
  if (!plan.autopilot && count > 3) {
    return { error: `The ${plan.name} plan generates up to 3 posts at a time. Upgrade for a full week.` };
  }

  const { context } = await getVoiceContext(workspace.id);
  const result = await generateWeek({
    topic,
    platforms: platforms.length ? platforms : ["linkedin"],
    voice: context,
    postsPerWeek: count,
  });

  const campaign = await db.campaign.create({
    data: { workspaceId: workspace.id, name: topic.slice(0, 60), topic },
  });

  const created: string[] = [];
  for (const item of result.posts) {
    const post = await db.post.create({
      data: {
        workspaceId: workspace.id,
        campaignId: campaign.id,
        body: item.body,
        // Autopilot drafts wait for a human. That's the whole contract.
        status: "needs_approval",
        source: "autopilot",
      },
    });
    for (const accountId of accountIds) {
      await db.postTarget.create({ data: { postId: post.id, accountId } });
    }
    await rescorePost(post.id);
    created.push(post.id);
  }

  bump();
  return { ok: true, created: created.length, campaignId: campaign.id, offline: result.offline };
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function switchWorkspace(workspaceId: string) {
  const { workspaces } = await requireWorkspace();
  if (!workspaces.some((w) => w.id === workspaceId)) return;
  const jar = await cookies();
  jar.set("pw_workspace", workspaceId, { path: "/", httpOnly: true, sameSite: "lax" });
  bump();
}

export async function createWorkspace(formData: FormData) {
  const { user, workspaces } = await requireWorkspace();
  const plan = planFor(user.plan);
  if (!plan.autopilot && workspaces.length >= 1) {
    return { error: "Multiple brands are a Pro feature." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the brand." };

  let slug = slugify(name);
  if (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const workspace = await db.workspace.create({
    data: {
      ownerId: user.id,
      name,
      slug,
      voiceProfiles: { create: { name: "Default voice", isDefault: true } },
      queueSlots: {
        create: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
          { dayOfWeek, hour: 9, minute: 15 },
          { dayOfWeek, hour: 16, minute: 30 },
        ]),
      },
    },
  });

  await switchWorkspace(workspace.id);
  bump();
  return { ok: true, id: workspace.id };
}
