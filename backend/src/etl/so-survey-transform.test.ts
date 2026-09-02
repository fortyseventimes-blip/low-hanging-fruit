import { describe, expect, it } from "vitest";
import {
  cohortKey,
  experienceBandFromYears,
  isUsableIndustry,
  resolveExperienceYears,
  syntheticBenchmark,
} from "./so-survey-transform.js";

describe("experienceBandFromYears", () => {
  it("buckets the boundary years into the band that starts at them", () => {
    expect(experienceBandFromYears(0)).toBe("0-2");
    expect(experienceBandFromYears(2)).toBe("2-5");
    expect(experienceBandFromYears(5)).toBe("5-10");
    expect(experienceBandFromYears(10)).toBe("10-15");
    expect(experienceBandFromYears(15)).toBe("15+");
  });

  it("buckets mid-range and very high years correctly", () => {
    expect(experienceBandFromYears(1)).toBe("0-2");
    expect(experienceBandFromYears(19)).toBe("15+");
    expect(experienceBandFromYears(100)).toBe("15+");
  });
});

describe("resolveExperienceYears", () => {
  it("prefers WorkExp when it is a valid number", () => {
    expect(resolveExperienceYears("7", "20")).toBe(7);
  });

  it("falls back to YearsCode when WorkExp is NA or blank", () => {
    expect(resolveExperienceYears("NA", "12")).toBe(12);
    expect(resolveExperienceYears("", "12")).toBe(12);
  });

  it("returns null when neither field is usable", () => {
    expect(resolveExperienceYears("NA", "NA")).toBeNull();
    expect(resolveExperienceYears("", "")).toBeNull();
  });
});

describe("isUsableIndustry", () => {
  it("accepts a real industry label", () => {
    expect(isUsableIndustry("Fintech")).toBe(true);
  });

  it("rejects NA, Other:, and blank", () => {
    expect(isUsableIndustry("NA")).toBe(false);
    expect(isUsableIndustry("Other:")).toBe(false);
    expect(isUsableIndustry("")).toBe(false);
    expect(isUsableIndustry("   ")).toBe(false);
  });
});

describe("cohortKey", () => {
  it("combines industry and band into a stable string", () => {
    expect(cohortKey("Fintech", "5-10")).toBe("Fintech::5-10");
  });
});

describe("syntheticBenchmark", () => {
  it("is deterministic for the same skill/cohort inputs", () => {
    const cohort = { industry: "Fintech", band: "5-10" as const };
    const a = syntheticBenchmark("skill-1", 2, 3, cohort);
    const b = syntheticBenchmark("skill-1", 2, 3, cohort);
    expect(a).toEqual(b);
  });

  it("produces mean/stddev/percentiles within the 1-5 rating scale", () => {
    const cohort = { industry: "Healthcare", band: "15+" as const };
    const result = syntheticBenchmark("skill-2", 3, 3, cohort);
    expect(result.mean).toBeGreaterThanOrEqual(1);
    expect(result.mean).toBeLessThanOrEqual(5);
    expect(result.stddev).toBeGreaterThan(0);
    for (const value of Object.values(result.percentileDistribution)) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it("trends higher mean for a more experienced cohort, all else equal", () => {
    const junior = syntheticBenchmark("skill-3", 2, 3, { industry: "Fintech", band: "0-2" });
    const senior = syntheticBenchmark("skill-3", 2, 3, { industry: "Fintech", band: "15+" });
    expect(senior.mean).toBeGreaterThan(junior.mean);
  });

  it("trends lower mean for a higher (more senior/rare) ring, all else equal", () => {
    const juniorRing = syntheticBenchmark("skill-4", 1, 3, { industry: "Fintech", band: "5-10" });
    const seniorRing = syntheticBenchmark("skill-4", 3, 3, { industry: "Fintech", band: "5-10" });
    expect(seniorRing.mean).toBeLessThan(juniorRing.mean);
  });

  it("percentiles are ordered p10 <= p25 <= p50 <= p75 <= p90", () => {
    const { percentileDistribution: p } = syntheticBenchmark("skill-5", 2, 3, {
      industry: "Retail and Consumer Services",
      band: "10-15",
    });
    expect(p.p10).toBeLessThanOrEqual(p.p25);
    expect(p.p25).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p75);
    expect(p.p75).toBeLessThanOrEqual(p.p90);
  });
});
