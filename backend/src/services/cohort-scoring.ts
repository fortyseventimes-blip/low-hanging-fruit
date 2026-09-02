import { experienceBandRange, type ExperienceBand } from "../lib/experience-bands.js";

// specs/cohort-benchmarking: "industry + experience_band (± 2 года)".
const MATCH_TOLERANCE_YEARS = 2;

export interface CohortCandidate {
  id: string;
  industry: string;
  experienceBand: ExperienceBand;
}

export interface CohortMatch {
  cohort: CohortCandidate;
  approximate: boolean;
}

// 0 если userYears внутри диапазона полосы, иначе — разрыв в годах до
// ближайшей границы. Используется и для допуска ±2 года, и для выбора
// "ближайшей" когорты, когда точного совпадения нет — единая метрика для
// обоих случаев из спеки.
function distanceToBand(userYears: number, band: ExperienceBand): number {
  const { min, max } = experienceBandRange(band);
  return Math.max(0, min - userYears, userYears - max);
}

// specs/cohort-benchmarking, "Пользователь сравнивается только с валидной
// когортой": сначала фильтр по industry, затем — точное совпадение по
// experience_band с допуском ±2 года; если такого нет — ближайшая по
// industry когорта с пометкой approximate=true.
export function selectCohort(
  cohorts: ReadonlyArray<CohortCandidate>,
  industry: string,
  userExperienceYears: number,
): CohortMatch | null {
  const sameIndustry = cohorts.filter((c) => c.industry === industry);
  if (sameIndustry.length === 0) return null;

  const ranked = sameIndustry
    .map((cohort) => ({ cohort, distance: distanceToBand(userExperienceYears, cohort.experienceBand) }))
    .sort((a, b) => a.distance - b.distance || a.cohort.id.localeCompare(b.cohort.id));

  const best = ranked[0];
  return { cohort: best.cohort, approximate: best.distance > MATCH_TOLERANCE_YEARS };
}

export interface AssessmentInput {
  skillId: string;
  selfRating: number | null;
  inferredRating: number | null;
}

export interface SkillGap {
  skillId: string;
  selfRating: number;
  cohortMean: number;
  gap: number;
}

export interface PendingConfirmation {
  skillId: string;
  inferredRating: number;
}

export interface GapCalculationResult {
  gaps: SkillGap[];
  pendingConfirmation: PendingConfirmation[];
}

// specs/assessment-scoring, "Разрыв с когортой считается только по
// подтверждённым навыкам": self_rating → gap = self_rating - mean;
// inferred_rating без self_rating → "требует подтверждения", вне расчёта.
export function computeCohortGaps(
  assessments: ReadonlyArray<AssessmentInput>,
  benchmarkMeanBySkillId: ReadonlyMap<string, number>,
): GapCalculationResult {
  const gaps: SkillGap[] = [];
  const pendingConfirmation: PendingConfirmation[] = [];

  for (const assessment of assessments) {
    if (assessment.selfRating !== null) {
      const mean = benchmarkMeanBySkillId.get(assessment.skillId);
      if (mean === undefined) continue; // когорта не покрывает этот навык — посчитать разрыв нечем
      gaps.push({
        skillId: assessment.skillId,
        selfRating: assessment.selfRating,
        cohortMean: mean,
        gap: Number((assessment.selfRating - mean).toFixed(2)),
      });
    } else if (assessment.inferredRating !== null) {
      pendingConfirmation.push({ skillId: assessment.skillId, inferredRating: assessment.inferredRating });
    }
  }

  return { gaps, pendingConfirmation };
}
