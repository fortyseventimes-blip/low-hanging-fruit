// design-brief-ui-elements.md §1 (SkillNode): 4 states, driven by whether
// an assessment exists, whether it's confirmed (self_rating vs an
// unconfirmed inferred_rating), and whether it clears the cohort mean by
// +1 stddev.
export type SkillNodeState = "unassessed" | "below_cohort" | "above_cohort" | "pending_confirmation";

export interface SkillAssessmentSummary {
  selfRating: number | null;
  inferredRating: number | null;
}

export interface CohortBenchmarkSummary {
  mean: number;
  stddev: number;
}

export function deriveSkillNodeState(
  assessment: SkillAssessmentSummary | null,
  benchmark: CohortBenchmarkSummary | null,
): SkillNodeState {
  if (!assessment || (assessment.selfRating === null && assessment.inferredRating === null)) {
    return "unassessed";
  }
  if (assessment.selfRating === null) {
    return "pending_confirmation";
  }
  if (benchmark && assessment.selfRating >= benchmark.mean + benchmark.stddev) {
    return "above_cohort";
  }
  return "below_cohort";
}
