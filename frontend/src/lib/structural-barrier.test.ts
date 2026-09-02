import { describe, expect, it } from "vitest";
import { buildStructuralBarrierCopy } from "./structural-barrier";

describe("buildStructuralBarrierCopy", () => {
  it("states the prevalence fact with role, geo, and credential together", () => {
    const { prevalenceSentence } = buildStructuralBarrierCopy({
      barrierType: "education",
      prevalencePct: 68,
      exceptionPct: 32,
      roleTitle: "Product Analyst",
      geo: "Germany",
    });
    expect(prevalenceSentence).toBe("68% of people in Product Analyst roles in Germany have a university degree.");
  });

  it("pairs the exception fact with a concrete counterbalance, never left bare", () => {
    const { exceptionSentence } = buildStructuralBarrierCopy({
      barrierType: "education",
      prevalencePct: 68,
      exceptionPct: 32,
      roleTitle: "Product Analyst",
      geo: "Germany",
    });
    expect(exceptionSentence).toContain("32%");
    expect(exceptionSentence).toContain("portfolio");
  });

  it("varies the credential/counterbalance wording per barrier type", () => {
    const social = buildStructuralBarrierCopy({
      barrierType: "social_capital",
      prevalencePct: 40,
      exceptionPct: 60,
      roleTitle: "Product Analyst",
      geo: "Germany",
    });
    expect(social.prevalenceSentence).toContain("professional network");
    expect(social.exceptionSentence).toContain("visibility");

    const certification = buildStructuralBarrierCopy({
      barrierType: "certification",
      prevalencePct: 50,
      exceptionPct: 50,
      roleTitle: "Product Analyst",
      geo: "Germany",
    });
    expect(certification.prevalenceSentence).toContain("certification");
    expect(certification.exceptionSentence).toContain("hands-on experience");
  });
});
