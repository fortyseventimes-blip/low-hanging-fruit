import { describe, expect, it } from "vitest";
import { isRecommendable, selectRoadmapCandidates, type SkillMeta } from "./roadmap-recommendation.js";
import { AiCategory } from "../generated/prisma/enums.js";

function skill(overrides: Partial<SkillMeta> & { id: string }): SkillMeta {
  return {
    name: overrides.id,
    keyQuestion: "?",
    ringIndex: 1,
    ringCount: 3,
    aiCategory: null,
    aiQualityStars: 1,
    aiQualityDeclining: false,
    ...overrides,
  };
}

describe("isRecommendable", () => {
  it("excludes replacement-category skills", () => {
    expect(isRecommendable({ aiCategory: AiCategory.replacement })).toBe(false);
  });

  it("includes every other category, including null", () => {
    expect(isRecommendable({ aiCategory: AiCategory.not_applicable })).toBe(true);
    expect(isRecommendable({ aiCategory: AiCategory.delegation })).toBe(true);
    expect(isRecommendable({ aiCategory: AiCategory.mediated_via_prep })).toBe(true);
    expect(isRecommendable({ aiCategory: null })).toBe(true);
  });
});

describe("selectRoadmapCandidates", () => {
  it("only considers skills where the user is behind the cohort (gap < 0)", () => {
    const skillsById = new Map([
      ["s1", skill({ id: "s1" })],
      ["s2", skill({ id: "s2" })],
    ]);
    const result = selectRoadmapCandidates(
      [
        { skillId: "s1", gap: 1.5 }, // ahead of cohort — not a development need
        { skillId: "s2", gap: -1.5 },
      ],
      skillsById,
    );
    expect(result.map((c) => c.skillId)).toEqual(["s2"]);
  });

  it("never recommends a replacement-category skill even with a large gap", () => {
    const skillsById = new Map([["s1", skill({ id: "s1", aiCategory: AiCategory.replacement })]]);
    const result = selectRoadmapCandidates([{ skillId: "s1", gap: -3 }], skillsById);
    expect(result).toEqual([]);
  });

  it("ranks not_applicable (highest AI resistance) above a plain skill with a bigger raw gap", () => {
    const skillsById = new Map([
      ["resistant", skill({ id: "resistant", aiCategory: AiCategory.not_applicable })],
      ["exposed", skill({ id: "exposed", aiCategory: AiCategory.delegation })],
    ]);
    const result = selectRoadmapCandidates(
      [
        { skillId: "resistant", gap: -0.5 }, // smaller gap
        { skillId: "exposed", gap: -3 }, // much bigger gap, but less AI-resistant
      ],
      skillsById,
    );
    expect(result[0].skillId).toBe("resistant");
  });

  it("ranks a senior-ring skill with decent human AI-quality above an unranked equal-category skill", () => {
    const skillsById = new Map([
      ["senior", skill({ id: "senior", ringIndex: 3, ringCount: 3, aiQualityStars: 4 })],
      ["junior", skill({ id: "junior", ringIndex: 1, ringCount: 3, aiQualityStars: 4 })],
    ]);
    const result = selectRoadmapCandidates(
      [
        { skillId: "senior", gap: -1 },
        { skillId: "junior", gap: -1 },
      ],
      skillsById,
    );
    expect(result[0].skillId).toBe("senior");
  });

  it("uses gap magnitude as a tiebreaker within the same resistance tier", () => {
    const skillsById = new Map([
      ["small-gap", skill({ id: "small-gap" })],
      ["big-gap", skill({ id: "big-gap" })],
    ]);
    const result = selectRoadmapCandidates(
      [
        { skillId: "small-gap", gap: -0.5 },
        { skillId: "big-gap", gap: -2 },
      ],
      skillsById,
    );
    expect(result[0].skillId).toBe("big-gap");
  });

  it("caps the result at maxCount", () => {
    const skillsById = new Map(["s1", "s2", "s3", "s4"].map((id) => [id, skill({ id })]));
    const result = selectRoadmapCandidates(
      [
        { skillId: "s1", gap: -1 },
        { skillId: "s2", gap: -2 },
        { skillId: "s3", gap: -3 },
        { skillId: "s4", gap: -4 },
      ],
      skillsById,
      3,
    );
    expect(result).toHaveLength(3);
  });

  it("returns an empty array when nothing qualifies", () => {
    expect(selectRoadmapCandidates([], new Map())).toEqual([]);
  });
});
