import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getWeights } from "@/lib/predictor";
import { scorePost } from "@/lib/scoring";
import { getVoiceContext } from "@/lib/voice";
import { voiceMatch } from "@/lib/voice-stats";
import { isPlatformId } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";

/** Live scoring for the composer. Pure computation, no model call, so it's fast. */
const body = z.object({
  text: z.string().max(20_000).default(""),
  platforms: z.array(z.string().max(40)).max(10).default([]),
});

export async function POST(req: Request) {
  const { workspace, user } = await requireWorkspace();

  // Generous: this is debounced per keystroke and costs no model call. The cap
  // exists to stop a runaway client, not to ration normal typing.
  const limited = await rateLimit(`score:${user.id}`, 600, 60);
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { text, platforms } = parsed.data;

  const targets = (platforms ?? []).filter(isPlatformId) as PlatformId[];
  if (!targets.length) targets.push("linkedin");

  const [{ context, traits }, { weights, trained, samples }] = await Promise.all([
    getVoiceContext(workspace.id),
    getWeights(workspace.id),
  ]);

  const scores = targets.map((platform) =>
    scorePost(text ?? "", platform, {
      traits,
      dontList: context?.dontList ?? [],
      weights,
    }),
  );

  return NextResponse.json({
    scores,
    voice: voiceMatch(text ?? "", traits, context?.dontList ?? []),
    predictor: { trained, samples },
  });
}
