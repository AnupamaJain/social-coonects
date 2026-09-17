import { describe, expect, it } from "vitest";
import {
  ASSUMPTION_META, DEFAULT_ASSUMPTIONS, DEFAULT_INPUTS, computeRoi,
} from "@/lib/roi";

describe("ROI model", () => {
  it("computes today's cost as plain arithmetic on the inputs", () => {
    const r = computeRoi({ postsPerWeek: 5, minutesPerPost: 60, hourlyCost: 100, channels: 1 });
    // One channel: no adaptation. 5 * 52 posts * 1 hour.
    expect(r.annualPosts).toBe(260);
    expect(r.annualHours).toBe(260);
    expect(r.annualCost).toBe(26_000);
  });

  it("charges extra channels at less than a fresh write", () => {
    const one = computeRoi({ ...DEFAULT_INPUTS, channels: 1 });
    const three = computeRoi({ ...DEFAULT_INPUTS, channels: 3 });
    expect(three.annualHours).toBeGreaterThan(one.annualHours);
    // Three channels must cost less than three separate writes.
    expect(three.annualHours).toBeLessThan(one.annualHours * 3);
  });

  it("saves nothing when every assumption is zeroed", () => {
    const r = computeRoi(DEFAULT_INPUTS, { draftingSaved: 0, belowBar: 0, adaptationSaved: 0 });
    expect(r.hoursSaved).toBe(0);
    expect(r.grossSaving).toBe(0);
    expect(r.netSaving).toBe(-r.planCost);
    expect(r.paybackDays).toBe(Infinity);
  });

  it("never saves more hours than exist", () => {
    const r = computeRoi(
      { postsPerWeek: 40, minutesPerPost: 180, hourlyCost: 300, channels: 6 },
      { draftingSaved: 0.6, belowBar: 0.5, adaptationSaved: 0.8 },
    );
    expect(r.hoursSaved).toBeLessThanOrEqual(r.annualHours);
    expect(r.newAnnualHours).toBeGreaterThanOrEqual(0);
  });

  it("is monotonic — a bigger assumption never returns less", () => {
    const low = computeRoi(DEFAULT_INPUTS, { ...DEFAULT_ASSUMPTIONS, draftingSaved: 0.1 });
    const high = computeRoi(DEFAULT_INPUTS, { ...DEFAULT_ASSUMPTIONS, draftingSaved: 0.5 });
    expect(high.hoursSaved).toBeGreaterThan(low.hoursSaved);
    expect(high.netSaving).toBeGreaterThan(low.netSaving);
  });

  it("subtracts a full year of the paid plan, not a month", () => {
    const r = computeRoi(DEFAULT_INPUTS);
    expect(r.planCost).toBe(29 * 12);
    expect(r.netSaving).toBeCloseTo(r.grossSaving - r.planCost, 5);
  });

  it("keeps defaults conservative enough to be arguable", () => {
    // If the case only works at optimistic settings it isn't a case.
    for (const [key, value] of Object.entries(DEFAULT_ASSUMPTIONS)) {
      const max = ASSUMPTION_META[key as keyof typeof ASSUMPTION_META].max;
      expect(value, `${key} default`).toBeLessThanOrEqual(max * 0.75);
    }
  });

  it("still pays back for a modest solo operator", () => {
    const r = computeRoi({ postsPerWeek: 3, minutesPerPost: 30, hourlyCost: 40, channels: 2 });
    expect(r.netSaving).toBeGreaterThan(0);
    expect(r.paybackDays).toBeLessThan(365);
  });
});
