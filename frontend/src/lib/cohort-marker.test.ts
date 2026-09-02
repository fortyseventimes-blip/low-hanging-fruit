import { describe, expect, it } from "vitest";
import { percentileFromRating, positionPct } from "./cohort-marker";

describe("percentileFromRating", () => {
  it("is 50 exactly at the mean", () => {
    expect(percentileFromRating(3, 3, 1)).toBe(50);
  });

  it("is above 50 when rating clears the mean", () => {
    expect(percentileFromRating(4, 3, 1)).toBeGreaterThan(50);
  });

  it("is below 50 when rating trails the mean", () => {
    expect(percentileFromRating(2, 3, 1)).toBeLessThan(50);
  });

  it("is symmetric around the mean", () => {
    const above = percentileFromRating(4, 3, 1);
    const below = percentileFromRating(2, 3, 1);
    expect(above + below).toBe(100);
  });

  it("matches the +1 stddev boundary used for SkillNode's above_cohort state (~84th percentile)", () => {
    expect(percentileFromRating(4, 3, 1)).toBe(84);
  });

  it("falls back to a hard split when stddev is degenerate (0)", () => {
    expect(percentileFromRating(3, 3, 0)).toBe(100);
    expect(percentileFromRating(2, 3, 0)).toBe(0);
  });
});

describe("positionPct", () => {
  it("maps the scale endpoints to 0 and 100", () => {
    expect(positionPct(1, 1, 5)).toBe(0);
    expect(positionPct(5, 1, 5)).toBe(100);
  });

  it("maps the midpoint to 50", () => {
    expect(positionPct(3, 1, 5)).toBe(50);
  });

  it("clamps values that overshoot the scale (e.g. mean + stddev past max)", () => {
    expect(positionPct(6, 1, 5)).toBe(100);
    expect(positionPct(-1, 1, 5)).toBe(0);
  });

  it("returns the midpoint when min === max instead of dividing by zero", () => {
    expect(positionPct(3, 3, 3)).toBe(50);
  });
});
