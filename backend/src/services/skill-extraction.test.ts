import { describe, expect, it } from "vitest";
import { buildSystemPrompt, clampRating, resolveAssessments, type SkillCatalogEntry } from "./skill-extraction.js";

const catalog: SkillCatalogEntry[] = [
  { id: "id-1", name: "Формулирование гипотез", keyQuestion: "Как ты формулируешь гипотезы?", models: "HADI" },
  { id: "id-2", name: "Анализ конкурентов", keyQuestion: "Как ты анализируешь конкурентов?", models: "SWOT" },
];

describe("buildSystemPrompt", () => {
  it("includes every skill name and key question from the catalog", () => {
    const prompt = buildSystemPrompt(catalog);
    expect(prompt).toContain("Формулирование гипотез");
    expect(prompt).toContain("Как ты формулируешь гипотезы?");
    expect(prompt).toContain("Анализ конкурентов");
  });

  it("instructs that indirect evidence cannot exceed a rating of 3", () => {
    expect(buildSystemPrompt(catalog)).toMatch(/3 or lower/);
  });
});

describe("clampRating", () => {
  it("leaves direct-evidence ratings untouched", () => {
    expect(clampRating({ skillName: "x", evidenceType: "direct", rating: 5 })).toBe(5);
  });

  it("caps indirect-evidence ratings at 3", () => {
    expect(clampRating({ skillName: "x", evidenceType: "indirect", rating: 5 })).toBe(3);
    expect(clampRating({ skillName: "x", evidenceType: "indirect", rating: 4 })).toBe(3);
  });

  it("leaves an indirect rating already at or below 3 untouched", () => {
    expect(clampRating({ skillName: "x", evidenceType: "indirect", rating: 2 })).toBe(2);
  });
});

describe("resolveAssessments", () => {
  it("maps known skill names to their ids and applies the indirect cap", () => {
    const result = resolveAssessments(
      [
        { skillName: "Формулирование гипотез", evidenceType: "direct", rating: 4 },
        { skillName: "Анализ конкурентов", evidenceType: "indirect", rating: 5 },
      ],
      catalog,
    );
    expect(result).toEqual([
      { skillId: "id-1", inferredRating: 4 },
      { skillId: "id-2", inferredRating: 3 },
    ]);
  });

  it("silently drops names that are not in the catalog instead of throwing", () => {
    const result = resolveAssessments(
      [{ skillName: "Made-up skill outside the catalog", evidenceType: "direct", rating: 5 }],
      catalog,
    );
    expect(result).toEqual([]);
  });
});
