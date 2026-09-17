/**
 * The business case, as arithmetic.
 *
 * Deliberately not a customer result. Sixfold has no case studies yet, and
 * inventing one would mean publishing specific, checkable claims about people
 * who don't exist. So this computes a case from the visitor's own numbers
 * instead, and every assumption it layers on top is labelled, sourced to a
 * product mechanic, and adjustable by the person reading it.
 *
 * Three acts:
 *   1. TODAY    — pure arithmetic on their inputs. No assumptions at all.
 *   2. CHANGE   — what the product mechanically does, as adjustable rates.
 *   3. RETURN   — arithmetic on (1) and (2), net of what the plan costs.
 */
import { PLANS } from "./plans";

export interface RoiInputs {
  /** Posts published each week today, across all channels. */
  postsPerWeek: number;
  /** Minutes to take one post from blank page to scheduled. */
  minutesPerPost: number;
  /** Blended hourly cost of whoever does that work. */
  hourlyCost: number;
  /** How many channels each post is adapted for. */
  channels: number;
}

export const DEFAULT_INPUTS: RoiInputs = {
  postsPerWeek: 5,
  minutesPerPost: 45,
  hourlyCost: 60,
  channels: 3,
};

export const INPUT_BOUNDS = {
  postsPerWeek: { min: 1, max: 40, step: 1 },
  minutesPerPost: { min: 5, max: 180, step: 5 },
  hourlyCost: { min: 10, max: 300, step: 5 },
  channels: { min: 1, max: 6, step: 1 },
} as const;

/**
 * Each rate is tied to a specific thing the product does. Defaults are set low
 * on purpose: a case that only works at optimistic settings isn't a case.
 */
export interface RoiAssumptions {
  /** Drafting time saved by variations + "make it sound like me". */
  draftingSaved: number;
  /** Share of drafts that don't clear your score bar and are never finished. */
  belowBar: number;
  /** Per-channel adaptation time saved by composing once with per-platform previews. */
  adaptationSaved: number;
}

export const DEFAULT_ASSUMPTIONS: RoiAssumptions = {
  draftingSaved: 0.3,
  belowBar: 0.2,
  adaptationSaved: 0.5,
};

export const ASSUMPTION_META: Record<
  keyof RoiAssumptions,
  { label: string; because: string; max: number }
> = {
  draftingSaved: {
    label: "Drafting time saved",
    because:
      "Variations give you three angles to start from, and one click rewrites a draft in your voice. You edit instead of starting cold.",
    max: 0.6,
  },
  belowBar: {
    label: "Drafts that never ship",
    because:
      "Every draft is scored before it goes out. The ones under your bar stop early, so you don't spend the last third polishing a post that shouldn't run.",
    max: 0.5,
  },
  adaptationSaved: {
    label: "Per-channel adaptation saved",
    because:
      "Compose once. Each channel gets its own preview, character count and score, so adapting is an edit rather than a rewrite.",
    max: 0.8,
  },
};

export interface RoiResult {
  /** Act 1 — today */
  annualPosts: number;
  annualHours: number;
  annualCost: number;
  /** Act 2 — the change */
  hoursSavedDrafting: number;
  hoursSavedBelowBar: number;
  hoursSavedAdaptation: number;
  newAnnualHours: number;
  /** Act 3 — the return */
  hoursSaved: number;
  grossSaving: number;
  planCost: number;
  netSaving: number;
  roiMultiple: number;
  paybackDays: number;
  daysReclaimed: number;
}

const WEEKS = 52;
const WORKING_DAY_HOURS = 8;

export function computeRoi(
  inputs: RoiInputs,
  assumptions: RoiAssumptions = DEFAULT_ASSUMPTIONS,
): RoiResult {
  const { postsPerWeek, minutesPerPost, hourlyCost, channels } = inputs;

  // --- Act 1: today. Their numbers, nothing added. ------------------------
  const annualPosts = postsPerWeek * WEEKS;

  // A post costs the base write plus adapting it for each extra channel. The
  // adaptation is charged at 40% of a fresh write, which is why cross-posting
  // is cheaper than writing again but is not free.
  const adaptationShare = 0.4 * Math.max(0, channels - 1);
  const hoursPerPost = (minutesPerPost / 60) * (1 + adaptationShare);
  const annualHours = annualPosts * hoursPerPost;
  const annualCost = annualHours * hourlyCost;

  // --- Act 2: what changes. Each line traceable to a mechanic. ------------
  const baseHours = annualPosts * (minutesPerPost / 60);
  const adaptHours = annualPosts * (minutesPerPost / 60) * adaptationShare;

  const hoursSavedDrafting = baseHours * assumptions.draftingSaved;

  // A draft that stops at the score stage still cost something — call it two
  // thirds of the work, since the expensive part is the finishing.
  const hoursSavedBelowBar =
    (baseHours - hoursSavedDrafting) * assumptions.belowBar * (1 / 3) +
    adaptHours * assumptions.belowBar;

  const hoursSavedAdaptation = adaptHours * assumptions.adaptationSaved;

  const hoursSaved = Math.min(
    annualHours,
    hoursSavedDrafting + hoursSavedBelowBar + hoursSavedAdaptation,
  );
  const newAnnualHours = annualHours - hoursSaved;

  // --- Act 3: the return. --------------------------------------------------
  const grossSaving = hoursSaved * hourlyCost;
  const planCost = PLANS.pro.price * 12;
  const netSaving = grossSaving - planCost;
  const roiMultiple = planCost > 0 ? grossSaving / planCost : 0;
  const paybackDays =
    grossSaving > 0 ? Math.max(1, Math.round((planCost / grossSaving) * 365)) : Infinity;
  const daysReclaimed = hoursSaved / WORKING_DAY_HOURS;

  return {
    annualPosts,
    annualHours,
    annualCost,
    hoursSavedDrafting,
    hoursSavedBelowBar,
    hoursSavedAdaptation,
    newAnnualHours,
    hoursSaved,
    grossSaving,
    planCost,
    netSaving,
    roiMultiple,
    paybackDays,
    daysReclaimed,
  };
}

export const money = (n: number) =>
  n >= 10_000
    ? `$${Math.round(n / 1000)}k`
    : `$${Math.round(n).toLocaleString()}`;

export const hours = (n: number) =>
  n >= 1000 ? `${Math.round(n / 100) / 10}k h` : `${Math.round(n)} h`;
