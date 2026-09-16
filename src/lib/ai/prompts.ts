import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import type { VoiceTraits } from "@/lib/voice-stats";

export interface VoiceContext {
  summary: string;
  traits: VoiceTraits;
  doList: string[];
  dontList: string[];
  samples: string[];
}

/**
 * The voice block is prepended to every generation call. Measured traits go in
 * alongside the prose summary because numbers ("13.4 words per sentence") steer
 * a model far harder than adjectives ("punchy").
 */
export function voiceBlock(voice: VoiceContext | null): string {
  if (!voice || !voice.traits.sampleCount) {
    return `No voice fingerprint is trained yet. Write in a clear, specific, human register. Avoid marketing filler and AI tells ("delve", "in today's fast-paced world", "game changer", "unlock").`;
  }

  const t = voice.traits;
  return `# The author's voice — match it closely

${voice.summary}

Measured from ${t.sampleCount} of their real posts:
- Sentence length: ${t.avgSentenceWords.toFixed(1)} words on average (variation ±${t.sentenceWordsSpread.toFixed(1)})
- ${Math.round(t.shortLineRate * 100)}% of their lines are six words or fewer
- Emoji per post: ${t.emojiPerPost.toFixed(1)} · Hashtags per post: ${t.hashtagPerPost.toFixed(1)}
- Exclamation marks per post: ${t.exclamationRate.toFixed(1)} · Questions per post: ${t.questionRate.toFixed(1)}
- First-person density: ${(t.firstPersonRate * 100).toFixed(1)}% of words
- Words they actually reach for: ${t.vocabulary.slice(0, 35).join(", ")}

How they open posts:
${t.hookPatterns.slice(0, 6).map((h) => `- "${h}"`).join("\n")}

${voice.doList.length ? `Do:\n${voice.doList.map((d) => `- ${d}`).join("\n")}` : ""}
${voice.dontList.length ? `Never:\n${voice.dontList.map((d) => `- ${d}`).join("\n")}` : ""}

Verbatim samples to imitate in rhythm (not in topic):
${voice.samples.slice(0, 4).map((s, i) => `--- sample ${i + 1} ---\n${s.slice(0, 700)}`).join("\n\n")}`;
}

export function platformBlock(platforms: PlatformId[]): string {
  return platforms
    .map((p) => {
      const d = getPlatform(p);
      return `- ${d.name}: hard limit ${d.charLimit} chars, best performance at ${d.sweetSpot[0]}-${d.sweetSpot[1]} chars, ${d.idealHashtags[1] === 0 ? "no hashtags" : `${d.idealHashtags[0]}-${d.idealHashtags[1]} hashtags`}${d.penalisesLinks ? ", outbound links suppress reach (put links in a comment)" : ""}${d.requiresMedia ? ", requires an image" : ""}`;
    })
    .join("\n");
}

export const WRITER_SYSTEM = `You write social posts that sound like a specific human being, not like a brand account and not like an AI.

Non-negotiable rules:
- Open with a line that earns the second line. A number, a concrete claim, a question, or something a reader would push back on.
- Be specific. Name the thing. Real numbers, real situations, real friction.
- One idea per post. Cut every sentence that is scaffolding.
- Never use: "delve", "in today's fast-paced world", "game changer", "unlock", "leverage" (as a verb), "supercharge", "revolutionise", "it's no secret", "the bottom line is".
- No engagement bait ("like and share", "tag a friend", "comment below").
- Do not use em dashes. Use a full stop or a comma.
- Match the author's voice profile exactly: sentence length, line breaks, emoji habits, vocabulary.
- Return the post body only. No preamble, no labels, no surrounding quotes.`;
