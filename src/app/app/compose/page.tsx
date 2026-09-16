import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/auth";
import { db, readJson } from "@/lib/db";
import { aiEnabled } from "@/lib/ai/model";
import { getVoiceContext } from "@/lib/voice";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string; saved?: string }>;
}) {
  const { post: postId } = await searchParams;
  const { workspace } = await requireWorkspace();

  const [accounts, voice, post] = await Promise.all([
    db.socialAccount.findMany({
      where: { workspaceId: workspace.id, status: "active" },
      orderBy: { createdAt: "asc" },
    }),
    getVoiceContext(workspace.id),
    postId
      ? db.post.findFirst({
          where: { id: postId, workspaceId: workspace.id },
          include: { targets: true },
        })
      : null,
  ]);

  return (
    <Composer
      accounts={accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName ?? a.handle,
        avatarUrl: a.avatarUrl,
        isSandbox: a.isSandbox,
      }))}
      workspaceName={workspace.name}
      voiceTrained={Boolean(voice.traits.sampleCount)}
      aiOnline={aiEnabled()}
      post={
        post
          ? {
              id: post.id,
              body: post.body,
              status: post.status,
              scheduledAt: post.scheduledAt?.toISOString() ?? null,
              mediaUrls: readJson<string[]>(post.mediaUrls, []),
              targets: post.targets.map((t) => ({
                accountId: t.accountId,
                override: t.override,
              })),
            }
          : null
      }
    />
  );
}
