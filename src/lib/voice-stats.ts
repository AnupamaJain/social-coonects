/**
 * Deterministic voice-trait extraction.
 *
 * Everything here is pure string math — no model call. That matters: the Voice
 * Match score has to run on every keystroke-debounce in the composer, for free,
 * and it has to keep working when no AI key is configured.
 */

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const STOPWORDS = new Set(
  `a an and are as at be but by for from had has have he her his i if in is it its me my not of on or our she so that the their them they this to was we were what when which who will with you your`.split(
    /\s+/,
  ),
);

export interface VoiceTraits {
  avgSentenceWords: number;
  sentenceWordsSpread: number;
  avgWordLength: number;
  emojiPerPost: number;
  hashtagPerPost: number;
  questionRate: number;
  exclamationRate: number;
  firstPersonRate: number;
  contractionRate: number;
  avgParagraphs: number;
  shortLineRate: number;
  /** Distinctive high-frequency tokens, the fingerprint's "vocabulary". */
  vocabulary: string[];
  /** Opening lines from the samples, used to grade new hooks. */
  hookPatterns: string[];
  sampleCount: number;
}

export const EMPTY_TRAITS: VoiceTraits = {
  avgSentenceWords: 0,
  sentenceWordsSpread: 0,
  avgWordLength: 0,
  emojiPerPost: 0,
  hashtagPerPost: 0,
  questionRate: 0,
  exclamationRate: 0,
  firstPersonRate: 0,
  contractionRate: 0,
  avgParagraphs: 0,
  shortLineRate: 0,
  vocabulary: [],
  hookPatterns: [],
  sampleCount: 0,
};

export const words = (text: string): string[] =>
  text.toLowerCase().match(/[a-z']+/g) ?? [];

export const sentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Per-post statistics — also used to score a single draft against a profile. */
export function statsForText(text: string) {
  const w = words(text);
  const sents = sentences(text);
  const lines = text.split("\n").filter((l) => l.trim());
  const sentenceLengths = sents.map((s) => words(s).length).filter(Boolean);

  return {
    words: w,
    wordCount: w.length,
    avgSentenceWords: mean(sentenceLengths),
    sentenceWordsSpread: stdev(sentenceLengths),
    avgWordLength: mean(w.map((x) => x.length)),
    emoji: (text.match(EMOJI_RE) ?? []).length,
    hashtags: (text.match(/#[\p{L}\d_]+/gu) ?? []).length,
    questions: (text.match(/\?/g) ?? []).length,
    exclamations: (text.match(/!/g) ?? []).length,
    firstPerson: w.filter((x) => ["i", "i'm", "i've", "my", "we", "our"].includes(x)).length,
    contractions: (text.match(/\b\w+'\w+\b/g) ?? []).length,
    paragraphs: text.split(/\n{2,}/).filter((p) => p.trim()).length,
    shortLines: lines.filter((l) => words(l).length <= 6).length,
    lineCount: lines.length,
    firstLine: lines[0] ?? "",
  };
}

export function extractTraits(samples: string[]): VoiceTraits {
  const texts = samples.map((s) => s.trim()).filter(Boolean);
  if (!texts.length) return EMPTY_TRAITS;

  const stats = texts.map(statsForText);
  const totalWords = stats.reduce((a, s) => a + s.wordCount, 0) || 1;

  // Distinctive vocabulary: frequent across samples, not a stopword, and
  // appearing in more than one post so we don't fingerprint a single topic.
  const docFreq = new Map<string, number>();
  const termFreq = new Map<string, number>();
  for (const s of stats) {
    const seen = new Set<string>();
    for (const w of s.words) {
      if (STOPWORDS.has(w) || w.length < 4) continue;
      termFreq.set(w, (termFreq.get(w) ?? 0) + 1);
      if (!seen.has(w)) {
        seen.add(w);
        docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
      }
    }
  }
  const vocabulary = [...termFreq.entries()]
    .filter(([w]) => (docFreq.get(w) ?? 0) >= Math.min(2, texts.length))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([w]) => w);

  return {
    avgSentenceWords: mean(stats.map((s) => s.avgSentenceWords)),
    sentenceWordsSpread: mean(stats.map((s) => s.sentenceWordsSpread)),
    avgWordLength: mean(stats.map((s) => s.avgWordLength)),
    emojiPerPost: mean(stats.map((s) => s.emoji)),
    hashtagPerPost: mean(stats.map((s) => s.hashtags)),
    questionRate: mean(stats.map((s) => s.questions)),
    exclamationRate: mean(stats.map((s) => s.exclamations)),
    firstPersonRate: stats.reduce((a, s) => a + s.firstPerson, 0) / totalWords,
    contractionRate: stats.reduce((a, s) => a + s.contractions, 0) / totalWords,
    avgParagraphs: mean(stats.map((s) => s.paragraphs)),
    shortLineRate: mean(stats.map((s) => (s.lineCount ? s.shortLines / s.lineCount : 0))),
    vocabulary,
    hookPatterns: stats.map((s) => s.firstLine).filter(Boolean).slice(0, 12),
    sampleCount: texts.length,
  };
}

/** 100 when `value` sits on `target`, decaying over `tolerance`. */
function closeness(value: number, target: number, tolerance: number) {
  if (tolerance <= 0) return value === target ? 100 : 0;
  return Math.max(0, 100 - (Math.abs(value - target) / tolerance) * 100);
}

export interface VoiceMatch {
  score: number;
  breakdown: { label: string; score: number; note: string }[];
}

/**
 * How much does this draft sound like the fingerprint? Each dimension is scored
 * independently so the composer can tell you *which* knob is off, not just that
 * something is.
 */
export function voiceMatch(
  text: string,
  traits: VoiceTraits,
  dontList: string[] = [],
): VoiceMatch {
  if (!traits.sampleCount || !text.trim()) {
    return {
      score: 0,
      breakdown: [
        {
          label: "Voice fingerprint",
          score: 0,
          note: traits.sampleCount
            ? "Nothing written yet."
            : "Add writing samples to train your fingerprint.",
        },
      ],
    };
  }

  const s = statsForText(text);
  const vocab = new Set(traits.vocabulary);
  const contentWords = s.words.filter((w) => !STOPWORDS.has(w) && w.length >= 4);
  const overlap = contentWords.length
    ? contentWords.filter((w) => vocab.has(w)).length / contentWords.length
    : 0;

  const rhythm = closeness(
    s.avgSentenceWords,
    traits.avgSentenceWords,
    Math.max(6, traits.avgSentenceWords * 0.5),
  );
  const cadence = closeness(
    s.lineCount ? s.shortLines / s.lineCount : 0,
    traits.shortLineRate,
    0.4,
  );
  const lexicon = Math.min(100, (overlap / Math.max(0.08, 0.28)) * 100);
  const punctuation =
    (closeness(s.emoji, traits.emojiPerPost, Math.max(1.5, traits.emojiPerPost + 1)) +
      closeness(s.exclamations, traits.exclamationRate, 2) +
      closeness(s.hashtags, traits.hashtagPerPost, Math.max(2, traits.hashtagPerPost + 1))) /
    3;
  const person = closeness(
    s.wordCount ? s.firstPerson / s.wordCount : 0,
    traits.firstPersonRate,
    0.06,
  );

  const lower = text.toLowerCase();
  const violations = dontList.filter((d) => d.trim() && lower.includes(d.toLowerCase().trim()));
  const cleanliness = Math.max(0, 100 - violations.length * 34);

  const breakdown = [
    { label: "Sentence rhythm", score: Math.round(rhythm), note: `${s.avgSentenceWords.toFixed(1)} words/sentence vs your ${traits.avgSentenceWords.toFixed(1)}` },
    { label: "Line cadence", score: Math.round(cadence), note: `${Math.round((s.lineCount ? s.shortLines / s.lineCount : 0) * 100)}% short lines vs your ${Math.round(traits.shortLineRate * 100)}%` },
    { label: "Vocabulary", score: Math.round(lexicon), note: `${Math.round(overlap * 100)}% of content words are ones you actually use` },
    { label: "Punctuation & emoji", score: Math.round(punctuation), note: `${s.emoji} emoji, ${s.hashtags} hashtags` },
    { label: "Point of view", score: Math.round(person), note: `${s.firstPerson} first-person words` },
    { label: "Banned phrases", score: Math.round(cleanliness), note: violations.length ? `Contains: ${violations.join(", ")}` : "Clean" },
  ];

  const weights = [0.22, 0.16, 0.24, 0.12, 0.12, 0.14];
  const score = Math.round(
    breakdown.reduce((acc, b, i) => acc + b.score * weights[i], 0),
  );

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}
