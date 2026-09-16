import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth";
import { planFor } from "@/lib/billing";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { rewriteInVoice } from "@/lib/ai/generate";
import { getVoiceContext } from "@/lib/voice";
import { isPlatformId } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";

export const maxDuration = 120;

const body = z.object({
  text: z.string().min(1).max(10_000),
  platform: z.string().max(40).optional(),
  weaknesses: z.array(z.string().max(500)).max(20).optional(),
});

export async function POST(req: Request) {
  const { workspace, user } = await requireWorkspace();

  const limited = await rateLimit(
    `ai:${user.id}`,
    planFor(user.plan).maxAiRunsPerDay,
    86_400,
  );
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nothing to rewrite." }, { status: 400 });
  }
  const { text, platform, weaknesses } = parsed.data;

  const { context } = await getVoiceContext(workspace.id);
  if (!context) {
    return NextResponse.json(
      { error: "Train your Voice Fingerprint first — it needs samples to match." },
      { status: 400 },
    );
  }

  try {
    const result = await rewriteInVoice({
      text,
      platform: (isPlatformId(platform ?? "") ? platform : "linkedin") as PlatformId,
      voice: context,
      weaknesses,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
