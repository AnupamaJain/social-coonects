import "server-only";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { aiEnabled, resolveModel } from "./model";
import { WRITER_SYSTEM, platformBlock, voiceBlock, type VoiceContext } from "./prompts";
import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { extractTraits } from "@/lib/voice-stats";

// ---------------------------------------------------------------------------
// Voice fingerprint distillation
// ---------------------------------------------------------------------------

const voiceSchema = z.object({
  summary: z.string().describe(
    "2-4 sentences describing how this person writes: register, attitude, structural habits. Written in second person ('You open with...').",
  ),
  doList: z.array(z.string()).max(8).describe("Concrete moves this writer makes that a ghostwriter should copy."),
  dontList: z.array(z.string()).max(8).describe("Words, phrases or habits that would immediately read as not-them."),
});

export async function distillVoice(samples: string[]) {
  const traits = extractTraits(samples);

  if (!aiEnabled() || samples.length === 0) {
    // Offline fallback: describe the measured traits without a model call.
    return {
      traits,
      summary: samples.length
        ? `Measured from ${traits.sampleCount} samples: about ${traits.avgSentenceWords.toFixed(0)} words per sentence, ${Math.round(traits.shortLineRate * 100)}% short lines, ${traits.emojiPerPost.toFixed(1)} emoji and ${traits.hashtagPerPost.toFixed(1)} hashtags per post.`
        : "No samples yet.",
      doList: samples.length
        ? [
            `Keep sentences near ${traits.avgSentenceWords.toFixed(0)} words`,
            `Use the words you actually use: ${traits.vocabulary.slice(0, 8).join(", ")}`,
          ]
        : [],
      dontList: ["delve", "in today's fast-paced world", "game changer", "unlock", "supercharge"],
      offline: true,
    };
  }

  const model = await resolveModel();
  const { object } = await generateObject({
    model,
    schema: voiceSchema,
    system:
      "You are a ghostwriting coach. You read a writer's real posts and produce a precise, usable description of their voice. Be concrete and behavioural, never flattering.",
    prompt: `Here are ${samples.length} real posts by one author. Describe their voice so another writer could pass as them.

Measured statistics (trust these over your impression):
- ${traits.avgSentenceWords.toFixed(1)} words per sentence
- ${Math.round(traits.shortLineRate * 100)}% of lines are 6 words or fewer
- ${traits.emojiPerPost.toFixed(1)} emoji and ${traits.hashtagPerPost.toFixed(1)} hashtags per post
- ${traits.questionRate.toFixed(1)} questions and ${traits.exclamationRate.toFixed(1)} exclamation marks per post

Posts:
${samples.map((s, i) => `--- post ${i + 1} ---\n${s.slice(0, 1200)}`).join("\n\n")}`,
  });

  return { traits, ...object, offline: false };
}

// ---------------------------------------------------------------------------
// Offline template writer — keeps the product usable with no AI key
// ---------------------------------------------------------------------------

function offlineVariations(seed: string, platform: PlatformId, count: number) {
  const def = getPlatform(platform);
  const topic = seed.trim().replace(/\s+/g, " ").slice(0, 160) || "your topic";
  const frames = [
    (t: string) => `Most teams get ${t} wrong in the same way.\n\nThey optimise the visible part and ignore the part that actually moves the number.\n\nWhat changed it for us was measuring the thing we were avoiding.\n\nWhat's the metric you keep not looking at?`,
    (t: string) => `We spent six weeks on ${t}.\n\nHere's what actually mattered:\n\n1. Start smaller than feels serious\n2. Ship before it's ready\n3. Cut the step nobody defends\n\nThe rest was theatre.\n\nWhat would you cut first?`,
    (t: string) => `Unpopular take on ${t}:\n\nDoing less of it, better, beats doing more of it.\n\nThe volume play looks productive. It rarely compounds.\n\nDisagree?`,
    (t: string) => `A question I keep coming back to on ${t}:\n\nIf you had to get the same result with half the effort, what would you stop doing?\n\nUsually the answer is obvious and uncomfortable.`,
    (t: string) => `${t}, in one line:\n\nThe bottleneck is almost never the thing you're working on.\n\nIt's the decision nobody wants to make.\n\nWhat's yours?`,
  ];
  return Array.from({ length: count }, (_, i) =>
    frames[i % frames.length](topic).slice(0, def.charLimit),
  );
}

// ---------------------------------------------------------------------------
// Variations
// ---------------------------------------------------------------------------

export async function generateVariations(input: {
  brief: string;
  platform: PlatformId;
  voice: VoiceContext | null;
  count?: number;
  existingDraft?: string;
}) {
  const count = input.count ?? 3;
  const def = getPlatform(input.platform);

  if (!aiEnabled()) {
    return {
      variations: offlineVariations(input.existingDraft || input.brief, input.platform, count),
      offline: true,
    };
  }

  const model = await resolveModel();
  const { object } = await generateObject({
    model,
    schema: z.object({
      variations: z
        .array(
          z.object({
            angle: z.string().describe("2-5 words naming the angle, e.g. 'contrarian take', 'personal story'"),
            body: z.string().describe("The full post body, ready to publish."),
          }),
        )
        .length(count),
    }),
    system: WRITER_SYSTEM,
    prompt: `${voiceBlock(input.voice)}

# Platform
${platformBlock([input.platform])}

# Task
Write ${count} genuinely different posts for ${def.name} about:

"""
${input.existingDraft ? `${input.brief}\n\nCurrent draft to improve on:\n${input.existingDraft}` : input.brief}
"""

Each one must take a different angle — do not rewrite the same post ${count} times. Vary the structure: one story, one contrarian claim, one concrete list, and so on. Stay inside ${def.charLimit} characters and aim for ${def.sweetSpot[0]}-${def.sweetSpot[1]}.`,
  });

  return { variations: object.variations.map((v) => v.body), angles: object.variations.map((v) => v.angle), offline: false };
}

// ---------------------------------------------------------------------------
// A week of content from one topic
// ---------------------------------------------------------------------------

export async function generateWeek(input: {
  topic: string;
  platforms: PlatformId[];
  voice: VoiceContext | null;
  postsPerWeek?: number;
}) {
  const n = input.postsPerWeek ?? 7;

  if (!aiEnabled()) {
    const bodies = offlineVariations(input.topic, input.platforms[0] ?? "linkedin", n);
    return {
      posts: bodies.map((body, i) => ({
        day: i + 1,
        angle: `Angle ${i + 1}`,
        body,
      })),
      offline: true,
    };
  }

  const model = await resolveModel();
  const { object } = await generateObject({
    model,
    schema: z.object({
      posts: z
        .array(
          z.object({
            day: z.number().describe("1-7, which day of the week this runs"),
            angle: z.string().describe("Short label for the angle."),
            body: z.string().describe("Full post body."),
          }),
        )
        .length(n),
    }),
    system: WRITER_SYSTEM,
    prompt: `${voiceBlock(input.voice)}

# Platforms
${platformBlock(input.platforms)}

# Task
Plan and write one week of posts — ${n} posts — on this topic:

"""
${input.topic}
"""

Treat it as a week with an arc, not ${n} disconnected posts:
- Open the week with the strongest, most opinionated piece.
- Mid-week: one concrete how-it-actually-works post and one story with a real detail.
- Include one post that argues against the obvious take on this topic.
- Close the week with something short and quotable.

No post may repeat another's hook or core claim. Keep each within ${Math.min(...input.platforms.map((p) => getPlatform(p).charLimit))} characters so it can be cross-posted.`,
  });

  return { posts: object.posts, offline: false };
}

// ---------------------------------------------------------------------------
// "Make it sound like me" — the fix-it button behind the Voice Match score
// ---------------------------------------------------------------------------

export async function rewriteInVoice(input: {
  text: string;
  platform: PlatformId;
  voice: VoiceContext | null;
  weaknesses?: string[];
}) {
  if (!aiEnabled()) {
    // Offline: apply the mechanical fixes we can make without a model.
    let out = input.text.replace(/\s*—\s*/g, ", ");
    for (const banned of input.voice?.dontList ?? []) {
      if (!banned.trim()) continue;
      out = out.replace(new RegExp(banned.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
    }
    out = out.replace(/[ \t]{2,}/g, " ").trim();
    return { text: out, offline: true };
  }

  const model = await resolveModel();
  const { text } = await generateText({
    model,
    system: WRITER_SYSTEM,
    prompt: `${voiceBlock(input.voice)}

# Platform
${platformBlock([input.platform])}

# Task
Rewrite the post below so it reads as if this author wrote it. Keep the substance and the claims. Change the rhythm, the vocabulary, the line breaks and the opening so they match the fingerprint above.

${input.weaknesses?.length ? `Specifically fix:\n${input.weaknesses.map((w) => `- ${w}`).join("\n")}\n` : ""}
Post to rewrite:
"""
${input.text}
"""

Return only the rewritten post.`,
  });

  return { text: text.trim(), offline: false };
}
