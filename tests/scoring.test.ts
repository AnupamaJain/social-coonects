import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, scorePost } from "@/lib/scoring";
import { extractTraits, voiceMatch } from "@/lib/voice-stats";

const GOOD = `We cut our posting volume by 60% and reach went up.

Turns out the algorithm was never the problem. We were publishing four mediocre posts a week because the calendar said to.

Now we publish two. Both get scored before they go out.

What would you drop first?`;

const BAD = `In today's fast-paced world, it is no secret that social media is a game changer for businesses looking to unlock growth. Check out https://example.com to learn more! Like and share! #marketing #growth #socialmedia #business #ai #content #b2b`;

describe("pre-flight scoring", () => {
  it("ranks a strong post well above a weak one", () => {
    const good = scorePost(GOOD, "linkedin").predicted;
    const bad = scorePost(BAD, "linkedin").predicted;
    expect(good).toBeGreaterThan(70);
    expect(bad).toBeLessThan(40);
    expect(good - bad).toBeGreaterThan(30);
  });

  it("penalises generic AI openers in the hook signal", () => {
    expect(scorePost(BAD, "linkedin").hook).toBeLessThan(30);
    expect(scorePost(GOOD, "linkedin").hook).toBeGreaterThan(70);
  });

  it("flags outbound links only where they actually suppress reach", () => {
    const text = "A real point worth making.\n\nhttps://example.com";
    expect(scorePost(text, "linkedin").algoRisk).toBeGreaterThan(20);
    expect(scorePost(text, "instagram").algoRisk).toBeLessThan(20);
  });

  it("scores length against each platform's own sweet spot", () => {
    const short = "Short and punchy. What do you think?";
    expect(scorePost(short, "x").lengthFit).toBeGreaterThan(
      scorePost(short, "linkedin").lengthFit,
    );
  });

  it("gives zero length-fit to a post over the hard limit", () => {
    expect(scorePost("x".repeat(400), "x").lengthFit).toBe(0);
  });

  it("returns actionable suggestions for a weak post", () => {
    const s = scorePost(BAD, "linkedin");
    expect(s.suggestions.length).toBeGreaterThan(2);
    expect(s.suggestions.join(" ")).toMatch(/first line|hashtag|link/i);
  });

  it("does not score down a workspace with no voice profile", () => {
    const withoutVoice = scorePost(GOOD, "linkedin").predicted;
    const withUntrained = scorePost(GOOD, "linkedin", {
      traits: extractTraits([]),
      weights: DEFAULT_WEIGHTS,
    }).predicted;
    expect(withUntrained).toBe(withoutVoice);
  });

  it("stays within 0-100 for empty input", () => {
    const s = scorePost("", "x");
    expect(s.predicted).toBeGreaterThanOrEqual(0);
    expect(s.predicted).toBeLessThanOrEqual(100);
  });
});

describe("voice fingerprint", () => {
  const samples = [
    "We cut posting volume by 60%.\n\nReach went up.\n\nWhat would you drop?",
    "The best hire I made failed the take-home.\n\nShe was right.\n\nHire for pushback.",
    "Everyone wants a content strategy.\n\nNobody wants the audit.\n\nIt takes an afternoon.",
  ];

  it("measures traits from real samples", () => {
    const t = extractTraits(samples);
    expect(t.sampleCount).toBe(3);
    expect(t.avgSentenceWords).toBeGreaterThan(0);
    expect(t.hookPatterns.length).toBeGreaterThan(0);
  });

  it("scores an in-voice draft above an out-of-voice one", () => {
    const t = extractTraits(samples);
    const inVoice = voiceMatch("We cut spend by 40%.\n\nPipeline went up.\n\nWhat would you cut?", t);
    const outOfVoice = voiceMatch(
      "Furthermore, the aforementioned methodological considerations necessitate comprehensive evaluation of organisational paradigms throughout the enterprise value chain.",
      t,
    );
    expect(inVoice.score).toBeGreaterThan(outOfVoice.score);
  });

  it("penalises banned phrases", () => {
    const t = extractTraits(samples);
    const clean = voiceMatch("We cut spend by 40%. What would you cut?", t, ["game changer"]);
    const dirty = voiceMatch("We cut spend by 40%. It was a game changer.", t, ["game changer"]);
    expect(dirty.score).toBeLessThan(clean.score);
  });

  it("reports zero with no samples rather than guessing", () => {
    expect(voiceMatch("anything", extractTraits([])).score).toBe(0);
  });
});
