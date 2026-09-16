import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { planFor } from "@/lib/billing";
import { generateVariations } from "@/lib/ai/generate";
import { getVoiceContext } from "@/lib/voice";
import { isPlatformId } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";

export const maxDuration = 120;

const body = z.object({
  brief: z.string().max(4000).optional(),
  draft: z.string().max(10_000).optional(),
  platform: z.string().max(40).optional(),
  count: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: Request) {
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  // Model calls cost money, so the plan's daily allowance is enforced here
  // rather than trusting the UI to hide the button.
  const limited = await rateLimit(`ai:${user.id}`, plan.maxAiRunsPerDay, 86_400);
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { brief, draft, platform, count } = parsed.data;

  if (!brief?.trim() && !draft?.trim()) {
    return NextResponse.json(
      { error: "Give it a topic or a draft to work from." },
      { status: 400 },
    );
  }

  const { context } = await getVoiceContext(workspace.id);

  try {
    const result = await generateVariations({
      brief: brief?.trim() || "Rewrite and improve the draft below.",
      existingDraft: draft?.trim() || undefined,
      platform: (isPlatformId(platform ?? "") ? platform : "linkedin") as PlatformId,
      voice: context,
      count: Math.min(plan.autopilot ? 5 : 3, Math.max(1, count ?? 3)),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
