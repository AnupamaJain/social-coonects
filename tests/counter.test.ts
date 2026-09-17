import { describe, expect, it } from "vitest";

/**
 * The exact substitution used by <Counter>. Kept in lockstep with the
 * component — it mangled "1,040" into "1,40" by matching digit runs either
 * side of the separator.
 */
const render = (value: string, progress: number) =>
  value.replace(/\d[\d,]*/g, (n) => {
    const grouped = n.includes(",");
    const next = Math.round(Number(n.replace(/,/g, "")) * progress);
    return grouped ? next.toLocaleString() : String(next);
  });

describe("Counter substitution", () => {
  it("keeps grouped numbers intact at rest", () => {
    expect(render("1,040", 1)).toBe("1,040");
    expect(render("12,480", 1)).toBe("12,480");
  });

  it("animates a grouped number without losing the separator", () => {
    expect(render("1,040", 0.5)).toBe("520");
    expect(render("1,040", 0)).toBe("0");
  });

  it("leaves surrounding text alone", () => {
    expect(render("$84k", 1)).toBe("$84k");
    expect(render("5 min", 1)).toBe("5 min");
    expect(render("0 keys", 1)).toBe("0 keys");
    expect(render("28 → 87", 1)).toBe("28 → 87");
  });

  it("animates every number in a compound value", () => {
    expect(render("28 → 87", 0)).toBe("0 → 0");
  });

  it("handles a value with no digits at all", () => {
    expect(render("—", 0.5)).toBe("—");
  });
});
