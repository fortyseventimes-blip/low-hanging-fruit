import { pointRadial } from "d3";

// design.md → "Ключевые решения дизайна данных" / spec skill-map:
// angle and radius are pure functions of Profession/SkillDomain data, no
// per-profession constants (no literal "60°" or ring count anywhere here).
export function domainAngleDegrees(orderIndex: number, domainCount: number): number {
  return (360 / domainCount) * orderIndex;
}

export function skillRadiusFraction(ringIndex: number, ringCount: number): number {
  return ringIndex / ringCount;
}

export interface MapPoint {
  xPct: number;
  yPct: number;
}

// d3's pointRadial puts angle 0 at 12 o'clock and increases clockwise —
// matches the MSFS-style radial reference in design-brief-ui-elements.md §0.
// radiusFraction is expected in roughly [0, ~1.2] (labels sit just past the
// outer ring); output is a percentage pair for absolute positioning inside a
// square container centered at (50%, 50%). `scale` (0, 1] shrinks that full
// radiusFraction=1 edge inward — a rendering concern (leaving room for node
// chrome and labels to not clip the container), not part of the ring/sector
// formula itself.
export function polarToPercent(angleDegrees: number, radiusFraction: number, scale = 1): MapPoint {
  const [x, y] = pointRadial((angleDegrees * Math.PI) / 180, radiusFraction * scale);
  return { xPct: 50 + x * 50, yPct: 50 + y * 50 };
}

// The real PAF catalog puts several skills at the same (domain, ring) —
// e.g. 7 skills share "Development & Delivery" ring 2. angle(domain) and
// radius(ring) alone would stack all of them on one point. This is a pure
// rendering concern layered on top, NOT a change to the ring/sector
// formula: the ring boundary is still exactly R_max * ring_index /
// ring_count, siblings just fan out around that point instead of sitting
// on it.
export interface RingGroupPosition {
  indexInRing: number;
  countInRing: number;
}

const SOLO_RING_GROUP: RingGroupPosition = { indexInRing: 0, countInRing: 1 };

export function skillAngleDegrees(
  orderIndex: number,
  domainCount: number,
  ringGroup: RingGroupPosition = SOLO_RING_GROUP,
): number {
  const baseAngle = domainAngleDegrees(orderIndex, domainCount);
  const { indexInRing, countInRing } = ringGroup;
  if (countInRing <= 1) return baseAngle;
  const sliceWidth = 360 / domainCount;
  const spread = sliceWidth * 0.92; // leaves a small gap so neighboring domains never touch
  const offset = ((indexInRing + 0.5) / countInRing - 0.5) * spread;
  return baseAngle + offset;
}

// Staggers siblings inward/outward around their ring's exact radius so a
// dense cell fans into several arcs instead of one crowded line. A pair
// only needs 2 lanes; the real catalog's worst case (7 skills in one
// cell) gets 3 — more lanes would each hold too few skills to be worth
// the extra radial spread.
export function skillRadiusJitter(ringCount: number, ringGroup: RingGroupPosition = SOLO_RING_GROUP): number {
  const { indexInRing, countInRing } = ringGroup;
  if (countInRing <= 2) return 0;
  const lanes = countInRing <= 4 ? 2 : 3;
  const laneOffsets = lanes === 2 ? [-1, 1] : [-1, 0, 1];
  const jitterUnit = (1 / ringCount) * 0.2;
  return laneOffsets[indexInRing % lanes] * jitterUnit;
}

// Ring 1 sits closest to center by the spec formula, which also means it
// gets the shortest arc length to fan siblings out along (arc length
// scales with radius). `innerRadiusFraction` pushes every ring outward by
// the same affine remap — another rendering-only knob, same category as
// `scale`: it changes how the formula's output is drawn, not the formula
// (ring_index / ring_count is still computed exactly as specified above).
export function skillPosition(
  orderIndex: number,
  domainCount: number,
  ringIndex: number,
  ringCount: number,
  scale = 1,
  ringGroup: RingGroupPosition = SOLO_RING_GROUP,
  innerRadiusFraction = 0,
): MapPoint {
  const angle = skillAngleDegrees(orderIndex, domainCount, ringGroup);
  const rawFraction = skillRadiusFraction(ringIndex, ringCount) + skillRadiusJitter(ringCount, ringGroup);
  const radiusFraction = innerRadiusFraction + (1 - innerRadiusFraction) * rawFraction;
  return polarToPercent(angle, radiusFraction, scale);
}
