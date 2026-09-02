import { describe, expect, it } from "vitest";
import { computeCohortGaps, selectCohort, type CohortCandidate } from "./cohort-scoring.js";

describe("selectCohort", () => {
  const cohorts: CohortCandidate[] = [
    { id: "c-fintech-0-2", industry: "Fintech", experienceBand: "0-2" },
    { id: "c-fintech-5-10", industry: "Fintech", experienceBand: "5-10" },
    { id: "c-fintech-15+", industry: "Fintech", experienceBand: "15+" },
    { id: "c-healthcare-5-10", industry: "Healthcare", experienceBand: "5-10" },
  ];

  it("picks the cohort whose band exactly covers the user's years, not approximate", () => {
    const result = selectCohort(cohorts, "Fintech", 7);
    expect(result).toEqual({ cohort: cohorts[1], approximate: false });
  });

  it("matches within the ±2 year tolerance around a band's edge", () => {
    // 7-10=−3.. actually 12 is 2 years past the 5-10 band's max (10) → within tolerance
    const result = selectCohort(cohorts, "Fintech", 12);
    expect(result).toEqual({ cohort: cohorts[1], approximate: false });
  });

  it("falls back to the nearest band by industry when nothing is within tolerance, marked approximate", () => {
    // 20 years: nearest band is 15+ (distance 0) — still exact by our tolerance rule (0 <= 2), pick something further to force approximate
    const result = selectCohort(cohorts, "Fintech", 25); // still 15+ distance 0, always exact — use a gap-only industry instead
    expect(result?.approximate).toBe(false);

    const sparse: CohortCandidate[] = [{ id: "only-band", industry: "Energy", experienceBand: "0-2" }];
    const farResult = selectCohort(sparse, "Energy", 10); // distance to [0,2) is 8, way past tolerance
    expect(farResult).toEqual({ cohort: sparse[0], approximate: true });
  });

  it("returns null when no cohort exists for the industry at all", () => {
    expect(selectCohort(cohorts, "Insurance", 5)).toBeNull();
  });

  it("never crosses into a different industry even when it would be a closer band", () => {
    const result = selectCohort(cohorts, "Healthcare", 1);
    expect(result?.cohort.id).toBe("c-healthcare-5-10");
  });
});

describe("computeCohortGaps", () => {
  it("computes gap = selfRating - cohortMean for confirmed assessments", () => {
    const result = computeCohortGaps(
      [{ skillId: "s1", selfRating: 4, inferredRating: null }],
      new Map([["s1", 3]]),
    );
    expect(result.gaps).toEqual([{ skillId: "s1", selfRating: 4, cohortMean: 3, gap: 1 }]);
    expect(result.pendingConfirmation).toEqual([]);
  });

  it("supports a negative gap when the user rates below the cohort mean", () => {
    const result = computeCohortGaps(
      [{ skillId: "s1", selfRating: 2, inferredRating: null }],
      new Map([["s1", 3.5]]),
    );
    expect(result.gaps[0].gap).toBe(-1.5);
  });

  it("routes an unconfirmed inferred-only assessment to pendingConfirmation, not gaps", () => {
    const result = computeCohortGaps(
      [{ skillId: "s1", selfRating: null, inferredRating: 3 }],
      new Map([["s1", 3]]),
    );
    expect(result.gaps).toEqual([]);
    expect(result.pendingConfirmation).toEqual([{ skillId: "s1", inferredRating: 3 }]);
  });

  it("skips a confirmed assessment when the cohort has no benchmark for that skill", () => {
    const result = computeCohortGaps([{ skillId: "s1", selfRating: 4, inferredRating: null }], new Map());
    expect(result.gaps).toEqual([]);
    expect(result.pendingConfirmation).toEqual([]);
  });

  it("handles a mix of confirmed and pending assessments in one call", () => {
    const result = computeCohortGaps(
      [
        { skillId: "s1", selfRating: 4, inferredRating: null },
        { skillId: "s2", selfRating: null, inferredRating: 2 },
      ],
      new Map([["s1", 3]]),
    );
    expect(result.gaps).toEqual([{ skillId: "s1", selfRating: 4, cohortMean: 3, gap: 1 }]);
    expect(result.pendingConfirmation).toEqual([{ skillId: "s2", inferredRating: 2 }]);
  });
});
