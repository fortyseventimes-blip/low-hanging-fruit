// Общий источник правды для полос опыта — используется и ETL
// (so-survey-transform.ts, при построении Cohort), и cohort-scoring.ts
// (при подборе когорты пользователю), чтобы оба места не могли разойтись
// в границах полос.
export const EXPERIENCE_BANDS = ["0-2", "2-5", "5-10", "10-15", "15+"] as const;
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number];

export function experienceBandFromYears(years: number): ExperienceBand {
  if (years < 2) return "0-2";
  if (years < 5) return "2-5";
  if (years < 10) return "5-10";
  if (years < 15) return "10-15";
  return "15+";
}

export interface ExperienceBandRange {
  min: number;
  max: number; // Infinity for the open-ended "15+" band
}

const BAND_RANGES: Record<ExperienceBand, ExperienceBandRange> = {
  "0-2": { min: 0, max: 2 },
  "2-5": { min: 2, max: 5 },
  "5-10": { min: 5, max: 10 },
  "10-15": { min: 10, max: 15 },
  "15+": { min: 15, max: Infinity },
};

export function experienceBandRange(band: ExperienceBand): ExperienceBandRange {
  return BAND_RANGES[band];
}
