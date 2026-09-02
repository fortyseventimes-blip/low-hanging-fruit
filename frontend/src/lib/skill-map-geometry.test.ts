import { describe, expect, it } from "vitest";
import {
  domainAngleDegrees,
  polarToPercent,
  skillAngleDegrees,
  skillPosition,
  skillRadiusFraction,
  skillRadiusJitter,
} from "./skill-map-geometry";

describe("domainAngleDegrees", () => {
  it("splits 6 domains into 60° sectors (PM default)", () => {
    expect(domainAngleDegrees(0, 6)).toBe(0);
    expect(domainAngleDegrees(1, 6)).toBe(60);
    expect(domainAngleDegrees(3, 6)).toBe(180);
  });

  it("derives sector width from domainCount, not a hardcoded 60°", () => {
    expect(domainAngleDegrees(1, 17)).toBeCloseTo(360 / 17, 10);
  });
});

describe("skillRadiusFraction", () => {
  it("places ring 1 of 3 closer to center than ring 3 of 3", () => {
    expect(skillRadiusFraction(1, 3)).toBeCloseTo(1 / 3, 10);
    expect(skillRadiusFraction(3, 3)).toBe(1);
  });

  it("derives fraction from ringCount, not a hardcoded 3", () => {
    expect(skillRadiusFraction(2, 4)).toBe(0.5);
  });
});

describe("polarToPercent", () => {
  it("places angle 0 at the top edge (12 o'clock)", () => {
    const { xPct, yPct } = polarToPercent(0, 1);
    expect(xPct).toBeCloseTo(50, 10);
    expect(yPct).toBeCloseTo(0, 10);
  });

  it("places angle 90 at the right edge (3 o'clock)", () => {
    const { xPct, yPct } = polarToPercent(90, 1);
    expect(xPct).toBeCloseTo(100, 10);
    expect(yPct).toBeCloseTo(50, 10);
  });

  it("maps radius 0 to dead center regardless of angle", () => {
    expect(polarToPercent(37, 0)).toEqual({ xPct: 50, yPct: 50 });
  });
});

describe("skillAngleDegrees", () => {
  it("is the plain domain angle when there's only one skill in the ring cell", () => {
    expect(skillAngleDegrees(1, 6)).toBe(domainAngleDegrees(1, 6));
    expect(skillAngleDegrees(1, 6, { indexInRing: 0, countInRing: 1 })).toBe(domainAngleDegrees(1, 6));
  });

  it("fans siblings out symmetrically around the domain's base angle", () => {
    const base = domainAngleDegrees(0, 6);
    const left = skillAngleDegrees(0, 6, { indexInRing: 0, countInRing: 2 });
    const right = skillAngleDegrees(0, 6, { indexInRing: 1, countInRing: 2 });
    expect(left).toBeLessThan(base);
    expect(right).toBeGreaterThan(base);
    expect(base - left).toBeCloseTo(right - base, 10);
  });

  it("keeps a dense ring cell (e.g. 7 skills, the real PAF max) within its own domain slice", () => {
    const domainCount = 6;
    const sliceHalfWidth = 360 / domainCount / 2;
    const base = domainAngleDegrees(2, domainCount);
    for (let i = 0; i < 7; i++) {
      const angle = skillAngleDegrees(2, domainCount, { indexInRing: i, countInRing: 7 });
      expect(Math.abs(angle - base)).toBeLessThan(sliceHalfWidth);
    }
  });

  it("spreads every sibling to a distinct angle", () => {
    const angles = [0, 1, 2, 3, 4].map((i) => skillAngleDegrees(0, 6, { indexInRing: i, countInRing: 5 }));
    expect(new Set(angles).size).toBe(5);
  });
});

describe("skillRadiusJitter", () => {
  it("is zero for a solo or pair (no crowding to resolve)", () => {
    expect(skillRadiusJitter(3, { indexInRing: 0, countInRing: 1 })).toBe(0);
    expect(skillRadiusJitter(3, { indexInRing: 1, countInRing: 2 })).toBe(0);
  });

  it("alternates inward/outward across 2 lanes for a moderately crowded ring cell", () => {
    const a = skillRadiusJitter(3, { indexInRing: 0, countInRing: 4 });
    const b = skillRadiusJitter(3, { indexInRing: 1, countInRing: 4 });
    expect(a).toBeLessThan(0);
    expect(b).toBeGreaterThan(0);
    expect(a).toBe(-b);
  });

  it("uses 3 lanes for the real catalog's worst case (7 skills in one cell)", () => {
    const lanes = [0, 1, 2, 3, 4, 5, 6].map((i) => skillRadiusJitter(3, { indexInRing: i, countInRing: 7 }));
    expect(new Set(lanes).size).toBe(3);
    expect(lanes[1]).toBe(0); // the middle lane sits exactly on the ring
    expect(lanes[0]).toBeLessThan(0);
    expect(lanes[2]).toBeGreaterThan(0);
    // the pattern repeats every 3 siblings
    expect(lanes[3]).toBe(lanes[0]);
    expect(lanes[6]).toBe(lanes[0]);
  });
});

describe("skillPosition", () => {
  it("matches independently combining angle + radius through polarToPercent", () => {
    const combined = skillPosition(2, 6, 2, 3);
    const manual = polarToPercent(domainAngleDegrees(2, 6), skillRadiusFraction(2, 3));
    expect(combined).toEqual(manual);
  });

  it("a different domain/ring count (e.g. 17 domains x 4 rings) uses the same code path", () => {
    const point = skillPosition(5, 17, 4, 4);
    expect(point.xPct).toBeGreaterThanOrEqual(0);
    expect(point.xPct).toBeLessThanOrEqual(100);
    expect(point.yPct).toBeGreaterThanOrEqual(0);
    expect(point.yPct).toBeLessThanOrEqual(100);
  });

  it("innerRadiusFraction pushes ring 1 outward without moving the outer ring", () => {
    const withoutOffset = skillPosition(0, 6, 1, 3, 1);
    const withOffset = skillPosition(0, 6, 1, 3, 1, undefined, 0.25);
    // angle 0 -> straight up, so a bigger radius means a smaller (more
    // negative) yPct offset from the 50% center.
    expect(withOffset.yPct).toBeLessThan(withoutOffset.yPct);

    const outerWithoutOffset = skillPosition(0, 6, 3, 3, 1);
    const outerWithOffset = skillPosition(0, 6, 3, 3, 1, undefined, 0.25);
    expect(outerWithOffset.yPct).toBeCloseTo(outerWithoutOffset.yPct, 10);
  });
});
