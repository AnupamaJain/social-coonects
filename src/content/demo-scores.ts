/**
 * The two demo scores every number on the landing page derives from.
 *
 * Computed, not typed in: the real scorer, the real demo fingerprint, default
 * weights (a visitor's browser has no trained predictor). Anything on the page
 * that quotes a score reads it from here, so the proof strip, the tool graphic,
 * the walkthrough captions and the share image cannot disagree with each other
 * or with what the playground would show for the same text.
 */
import { scorePost } from "@/lib/scoring";
import { extractTraits } from "@/lib/voice-stats";
import { DEMO_AI_DRAFT, DEMO_DONT_LIST, DEMO_HUMAN_DRAFT, DEMO_VOICE_SAMPLES } from "./demo-voice";

const traits = extractTraits(DEMO_VOICE_SAMPLES);
const opts = { traits, dontList: DEMO_DONT_LIST };

export const DEMO_SCORE_AI = scorePost(DEMO_AI_DRAFT, "linkedin", opts);
export const DEMO_SCORE_HUMAN = scorePost(DEMO_HUMAN_DRAFT, "linkedin", opts);
