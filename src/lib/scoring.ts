/**
 * Pre-flight performance scoring.
 *
 * Six independent signals, each a plain heuristic, combined by a weight vector
 * that starts at a sensible default and is then refit per workspace against
 * real engagement (see lib/predictor.ts). That refit is the moat: after ~15
 * published posts the score is about *your* audience, not a generic rubric.
 */
import { getPlatform } from "./platforms/registry";
import type { PlatformId } from "./platforms/types";
import { statsForText, voiceMatch, type VoiceTraits } from "./voice-stats";

export interface ScoreWeights {
  hook: number;
  readability: number;
  cta: number;
  lengthFit: number;
  algoRisk: number;
  voiceMatch: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  hook: 0.3,
  readability: 0.14,
  cta: 0.12,
  lengthFit: 0.16,
  algoRisk: 0.16, // applied against (100 - risk)
  voiceMatch: 0.12,
};

export interface Signal {
  label: string;
  score: number;
  detail: string;
}

export interface PostScoreResult {
  platform: PlatformId;
  hook: number;
  readability: number;
  cta: number;
  lengthFit: number;
  algoRisk: number;
  voiceMatch: number;
  predicted: number;
  signals: Signal[];
  suggestions: string[];
}

const GENERIC_OPENERS = [
  "in today's world", "in today's fast-paced", "i am excited to announce",
  "i'm excited to announce", "i am thrilled", "i'm thrilled", "as we all know",
  "let's dive in", "in this article", "it is no secret", "it's no secret",
  "without further ado", "game changer", "game-changer",
];

const ENGAGEMENT_BAIT = [
  "like and share", "comment below", "tag a friend", "double tap",
  "follow for more", "smash that", "link in bio 👇👇",
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function scoreHook(text: string): { score: number; detail: string } {
  const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? "";
  if (!firstLine) return { score: 0, detail: "No opening line." };

  let score = 45;
  const notes: string[] = [];
  const lower = firstLine.toLowerCase();
  const len = firstLine.length;

  // Short openers survive the "see more" truncation on every platform.
  if (len <= 90) { score += 18; notes.push("tight opener"); }
  else if (len <= 140) { score += 8; }
  else { score -= 12; notes.push("opener runs long"); }

  if (/^\W*\d|\b\d+(\.\d+)?%|\b\d{2,}\b/.test(firstLine)) { score += 12; notes.push("leads with a number"); }
  if (firstLine.includes("?")) { score += 9; notes.push("opens with a question"); }
  if (/\b(most|everyone|nobody|stop|never|why|how i|the truth|unpopular)\b/i.test(firstLine)) {
    score += 11; notes.push("tension in the first line");
  }
  if (GENERIC_OPENERS.some((g) => lower.startsWith(g) || lower.includes(g))) {
    score -= 28; notes.push("generic AI-sounding opener");
  }
  if (/^[A-Z\s!]{15,}$/.test(firstLine)) { score -= 15; notes.push("all-caps shouting"); }
  // A line break right after the hook creates the scroll-stopping gap.
  if (/\n\s*\n/.test(text.slice(0, firstLine.length + 4))) { score += 6; notes.push("breathing room after the hook"); }

  return {
    score: clamp(score),
    detail: notes.length ? notes.join(", ") : "nothing distinctive in the first line",
  };
}

function scoreReadability(text: string): { score: number; detail: string } {
  const s = statsForText(text);
  if (!s.wordCount) return { score: 0, detail: "Empty." };

  // Target ~14 words/sentence and ~4.6 chars/word: conversational, not academic.
  const sentencePenalty = Math.max(0, s.avgSentenceWords - 20) * 3.2;
  const wordPenalty = Math.max(0, s.avgWordLength - 5.1) * 22;
  const wallOfText =
    s.lineCount <= 2 && s.wordCount > 90 ? 22 : 0;
  const score = clamp(100 - sentencePenalty - wordPenalty - wallOfText);

  return {
    score,
    detail: `${s.avgSentenceWords.toFixed(1)} words/sentence, ${s.paragraphs} paragraph${s.paragraphs === 1 ? "" : "s"}${wallOfText ? ", reads as a wall of text" : ""}`,
  };
}

function scoreCta(text: string): { score: number; detail: string } {
  const lines = text.split("\n").filter((l) => l.trim());
  const tail = lines.slice(-2).join(" ").toLowerCase();
  if (!tail) return { score: 0, detail: "No closing line." };

  let score = 30;
  const notes: string[] = [];
  if (tail.includes("?")) { score += 35; notes.push("ends on a question"); }
  if (/\b(what would you|how do you|curious|thoughts|agree|disagree|tell me|your take)\b/.test(tail)) {
    score += 25; notes.push("invites a reply");
  }
  if (/\b(dm me|book a|get the|try it|sign up|join|download|read the)\b/.test(tail)) {
    score += 14; notes.push("explicit ask");
  }
  if (ENGAGEMENT_BAIT.some((b) => tail.includes(b))) {
    score -= 30; notes.push("engagement bait — platforms downrank this");
  }
  return {
    score: clamp(score),
    detail: notes.length ? notes.join(", ") : "closes without asking for anything",
  };
}

function scoreLengthFit(text: string, platform: PlatformId): { score: number; detail: string } {
  const def = getPlatform(platform);
  const len = text.trim().length;
  const [lo, hi] = def.sweetSpot;

  if (len > def.charLimit) {
    return { score: 0, detail: `${len} chars — over the ${def.charLimit} limit for ${def.name}` };
  }
  if (len >= lo && len <= hi) {
    return { score: 100, detail: `${len} chars — in the sweet spot for ${def.name}` };
  }
  const distance = len < lo ? (lo - len) / lo : (len - hi) / Math.max(1, def.charLimit - hi);
  return {
    score: clamp(100 - distance * 100),
    detail: `${len} chars — ${def.name} performs best at ${lo}-${hi}`,
  };
}

function scoreAlgoRisk(text: string, platform: PlatformId): { score: number; detail: string } {
  const def = getPlatform(platform);
  let risk = 0;
  const notes: string[] = [];

  const links = text.match(/https?:\/\/\S+/g) ?? [];
  if (links.length && def.penalisesLinks) {
    risk += 30; notes.push(`${links.length} outbound link${links.length > 1 ? "s" : ""} — ${def.name} suppresses reach; put it in the first comment`);
  }
  const hashtags = (text.match(/#[\p{L}\d_]+/gu) ?? []).length;
  const [, maxTags] = def.idealHashtags;
  if (hashtags > maxTags) {
    risk += Math.min(25, (hashtags - maxTags) * 6);
    notes.push(`${hashtags} hashtags — ${def.name} wants at most ${maxTags}`);
  }
  const lower = text.toLowerCase();
  const bait = ENGAGEMENT_BAIT.filter((b) => lower.includes(b));
  if (bait.length) { risk += 22; notes.push("engagement bait detected"); }
  const emoji = (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emoji > 8) { risk += 12; notes.push(`${emoji} emoji is a lot`); }
  if ((text.match(/@\w+/g) ?? []).length > 5) { risk += 10; notes.push("heavy tagging reads as spam"); }

  return {
    score: clamp(risk),
    detail: notes.length ? notes.join("; ") : "no reach-suppressing patterns",
  };
}

export function scorePost(
  text: string,
  platform: PlatformId,
  opts: {
    traits?: VoiceTraits;
    dontList?: string[];
    weights?: ScoreWeights;
  } = {},
): PostScoreResult {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  const hook = scoreHook(text);
  const readability = scoreReadability(text);
  const cta = scoreCta(text);
  const lengthFit = scoreLengthFit(text, platform);
  const algoRisk = scoreAlgoRisk(text, platform);
  const vm = opts.traits
    ? voiceMatch(text, opts.traits, opts.dontList ?? [])
    : { score: 0, breakdown: [] };

  // Voice only counts once the fingerprint is actually trained; otherwise its
  // weight is redistributed so an untrained workspace isn't scored down.
  const voiceTrained = Boolean(opts.traits?.sampleCount);
  const wSum =
    weights.hook + weights.readability + weights.cta + weights.lengthFit +
    weights.algoRisk + (voiceTrained ? weights.voiceMatch : 0);

  const raw =
    weights.hook * hook.score +
    weights.readability * readability.score +
    weights.cta * cta.score +
    weights.lengthFit * lengthFit.score +
    weights.algoRisk * (100 - algoRisk.score) +
    (voiceTrained ? weights.voiceMatch * vm.score : 0);

  // Deliberately a weighted *average* of the signals, so the number keeps an
  // absolute meaning (80 is a strong post, everywhere, for everyone). Training
  // changes which signals carry the weight, never the level — a workspace whose
  // posts all improve should see its scores go up, not recentre on 50.
  const predicted = clamp(raw / (wSum || 1));

  const signals: Signal[] = [
    { label: "Hook", score: hook.score, detail: hook.detail },
    { label: "Readability", score: readability.score, detail: readability.detail },
    { label: "Call to action", score: cta.score, detail: cta.detail },
    { label: "Length fit", score: lengthFit.score, detail: lengthFit.detail },
    { label: "Algorithm risk", score: 100 - algoRisk.score, detail: algoRisk.detail },
    ...(voiceTrained
      ? [{ label: "Voice match", score: vm.score, detail: `${vm.score}% like your fingerprint` }]
      : []),
  ];

  const suggestions: string[] = [];
  if (hook.score < 60) suggestions.push("Rewrite the first line — lead with a number, a question, or something people would argue with.");
  if (lengthFit.score < 55) suggestions.push(lengthFit.detail);
  if (algoRisk.score > 35) suggestions.push(algoRisk.detail);
  if (cta.score < 50) suggestions.push("Close with a question so replies have somewhere to go.");
  if (readability.score < 60) suggestions.push("Break this into shorter sentences and add line breaks.");
  if (voiceTrained && vm.score < 60) suggestions.push("This doesn't sound like you yet — run 'Make it sound like me'.");

  return {
    platform,
    hook: hook.score,
    readability: readability.score,
    cta: cta.score,
    lengthFit: lengthFit.score,
    algoRisk: algoRisk.score,
    voiceMatch: vm.score,
    predicted,
    signals,
    suggestions,
  };
}

export const scoreBand = (n: number) =>
  n >= 80 ? "Strong" : n >= 65 ? "Good" : n >= 45 ? "Fair" : "Weak";
