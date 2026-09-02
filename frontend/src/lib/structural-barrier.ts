export type StructuralBarrierType = "education" | "certification" | "social_capital";

// design-brief-ui-elements.md §5: what the credential is called, and what
// the "got in anyway" exception usually looks like — varies by barrier
// type, everything else about the copy structure is fixed.
export const BARRIER_META: Record<StructuralBarrierType, { credential: string; counterbalance: string }> = {
  education: { credential: "a university degree", counterbalance: "a strong portfolio" },
  certification: {
    credential: "a professional certification",
    counterbalance: "demonstrated hands-on experience",
  },
  social_capital: {
    credential: "an established professional network",
    counterbalance: "public visibility — writing, talks, community work",
  },
};

export interface StructuralBarrierCopyInput {
  barrierType: StructuralBarrierType;
  prevalencePct: number;
  exceptionPct: number;
  roleTitle: string;
  geo: string;
}

export interface StructuralBarrierCopy {
  prevalenceSentence: string;
  exceptionSentence: string;
}

// The two-sentence structure spec skill-map/onboarding require: the
// prevalence fact, then the counterbalance in the same breath — never the
// fact alone (that would read as a hard requirement, not a statistic).
export function buildStructuralBarrierCopy({
  barrierType,
  prevalencePct,
  exceptionPct,
  roleTitle,
  geo,
}: StructuralBarrierCopyInput): StructuralBarrierCopy {
  const meta = BARRIER_META[barrierType];
  return {
    prevalenceSentence: `${prevalencePct}% of people in ${roleTitle} roles in ${geo} have ${meta.credential}.`,
    exceptionSentence: `${exceptionPct}% without it are in the role anyway — usually through ${meta.counterbalance}.`,
  };
}
