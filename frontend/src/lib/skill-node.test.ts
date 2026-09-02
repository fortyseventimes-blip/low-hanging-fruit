import { describe, expect, it } from "vitest";
import { deriveSkillNodeState } from "./skill-node";

describe("deriveSkillNodeState", () => {
  it("is unassessed when there's no assessment at all", () => {
    expect(deriveSkillNodeState(null, { mean: 3, stddev: 1 })).toBe("unassessed");
  });

  it("is unassessed when the assessment has neither rating set", () => {
    expect(deriveSkillNodeState({ selfRating: null, inferredRating: null }, null)).toBe("unassessed");
  });

  it("is pending_confirmation when only an unconfirmed inferred rating exists", () => {
    expect(deriveSkillNodeState({ selfRating: null, inferredRating: 4 }, { mean: 3, stddev: 1 })).toBe(
      "pending_confirmation",
    );
  });

  it("is below_cohort when self_rating is under mean + 1 stddev", () => {
    expect(deriveSkillNodeState({ selfRating: 3, inferredRating: null }, { mean: 3, stddev: 1 })).toBe(
      "below_cohort",
    );
  });

  it("is above_cohort when self_rating clears mean + 1 stddev", () => {
    expect(deriveSkillNodeState({ selfRating: 4, inferredRating: null }, { mean: 3, stddev: 1 })).toBe(
      "above_cohort",
    );
  });

  it("treats exactly mean + 1 stddev as above_cohort (boundary is inclusive)", () => {
    expect(deriveSkillNodeState({ selfRating: 4, inferredRating: null }, { mean: 3, stddev: 1 })).toBe(
      "above_cohort",
    );
  });

  it("falls back to below_cohort when confirmed but no benchmark is available to compare against", () => {
    expect(deriveSkillNodeState({ selfRating: 5, inferredRating: null }, null)).toBe("below_cohort");
  });
});
