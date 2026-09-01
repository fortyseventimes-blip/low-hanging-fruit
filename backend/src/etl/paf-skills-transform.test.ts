import { describe, expect, it } from "vitest";
import { AiCategory } from "../generated/prisma/client.js";
import {
  aiCategoryFromLabel,
  dedupeUndirectedPairs,
  isAiQualityDeclining,
  parseConnectionNames,
  ringIndexFromLabel,
} from "./paf-skills-transform.js";

describe("ringIndexFromLabel", () => {
  it("maps the three known ring labels to 1..3", () => {
    expect(ringIndexFromLabel("Junior (внутр. кольцо)")).toBe(1);
    expect(ringIndexFromLabel("Middle-Senior (среднее)")).toBe(2);
    expect(ringIndexFromLabel("Senior/Head/CPO (внешн.)")).toBe(3);
  });

  it("throws on an unrecognized label", () => {
    expect(() => ringIndexFromLabel("Unknown")).toThrow(/Unknown ring label/);
  });
});

describe("aiCategoryFromLabel", () => {
  it("maps known Russian labels to the enum", () => {
    expect(aiCategoryFromLabel("Не применимо")).toBe(AiCategory.not_applicable);
    expect(aiCategoryFromLabel("Опосредованно - через подготовку")).toBe(AiCategory.mediated_via_prep);
    expect(aiCategoryFromLabel("Делегирование")).toBe(AiCategory.delegation);
    expect(aiCategoryFromLabel("Замещение")).toBe(AiCategory.replacement);
  });

  it("treats the known duplicate-label data artifact as delegation", () => {
    expect(aiCategoryFromLabel("Делегирование; Делегирование")).toBe(AiCategory.delegation);
  });

  it("returns null for blank/missing labels", () => {
    expect(aiCategoryFromLabel(null)).toBeNull();
    expect(aiCategoryFromLabel(undefined)).toBeNull();
    expect(aiCategoryFromLabel("")).toBeNull();
    expect(aiCategoryFromLabel("   ")).toBeNull();
  });

  it("throws on an unrecognized label", () => {
    expect(() => aiCategoryFromLabel("что-то новое")).toThrow(/Unknown ai_category label/);
  });
});

describe("parseConnectionNames", () => {
  it("splits on ; and trims", () => {
    expect(parseConnectionNames("A; B;C")).toEqual(["A", "B", "C"]);
  });

  it("returns an empty array for null/undefined/blank input", () => {
    expect(parseConnectionNames(null)).toEqual([]);
    expect(parseConnectionNames(undefined)).toEqual([]);
    expect(parseConnectionNames("")).toEqual([]);
  });
});

describe("isAiQualityDeclining", () => {
  it("flags the curated known finding from design.md", () => {
    expect(isAiQualityDeclining("Приоритизация беклога для передачи в разработку")).toBe(true);
  });

  it("defaults to false for any other skill", () => {
    expect(isAiQualityDeclining("Мониторинг показателей продукта")).toBe(false);
  });
});

describe("dedupeUndirectedPairs", () => {
  it("collapses a reciprocal pair into one edge", () => {
    const result = dedupeUndirectedPairs([
      ["A", "B"],
      ["B", "A"],
    ]);
    expect(result).toEqual([["A", "B"]]);
  });

  it("keeps distinct pairs and normalizes ordering", () => {
    const result = dedupeUndirectedPairs([
      ["B", "A"],
      ["C", "D"],
    ]);
    expect(result).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  it("drops self-loops", () => {
    expect(dedupeUndirectedPairs([["A", "A"]])).toEqual([]);
  });
});
