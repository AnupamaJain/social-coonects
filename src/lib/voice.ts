import "server-only";
import { db, readJson, writeJson } from "./db";
import { distillVoice } from "./ai/generate";
import type { VoiceContext } from "./ai/prompts";
import { EMPTY_TRAITS, extractTraits, type VoiceTraits } from "./voice-stats";

export async function getVoiceProfile(workspaceId: string) {
  let profile = await db.voiceProfile.findFirst({
    where: { workspaceId, isDefault: true },
    include: { samples: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) {
    await db.voiceProfile.create({
      data: { workspaceId, name: "Default voice", isDefault: true },
    });
    profile = await db.voiceProfile.findFirst({
      where: { workspaceId, isDefault: true },
      include: { samples: { orderBy: { createdAt: "desc" } } },
    });
  }
  return profile!;
}

export async function getVoiceContext(
  workspaceId: string,
): Promise<{ context: VoiceContext | null; traits: VoiceTraits }> {
  const profile = await getVoiceProfile(workspaceId);
  const samples = profile.samples.map((s) => s.text);
  const traits = readJson<VoiceTraits>(profile.traits, EMPTY_TRAITS);
  const resolved = traits.sampleCount ? traits : extractTraits(samples);

  if (!samples.length) return { context: null, traits: EMPTY_TRAITS };

  return {
    traits: resolved,
    context: {
      summary: profile.summary,
      traits: resolved,
      doList: readJson<string[]>(profile.doList, []),
      dontList: readJson<string[]>(profile.dontList, []),
      samples,
    },
  };
}

/** Re-runs trait extraction plus the model-written summary after samples change. */
export async function retrainVoice(workspaceId: string) {
  const profile = await getVoiceProfile(workspaceId);
  const samples = profile.samples.map((s) => s.text);
  const result = await distillVoice(samples);

  await db.voiceProfile.update({
    where: { id: profile.id },
    data: {
      traits: writeJson(result.traits),
      summary: result.summary,
      doList: writeJson(result.doList),
      dontList: writeJson(result.dontList),
      sampleCount: samples.length,
    },
  });

  return result;
}
