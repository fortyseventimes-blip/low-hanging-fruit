export const SAMPLE_SOURCE = "Stack Overflow Developer Survey 2025";

// Матчинг когорты по requirements/cohort-benchmarking/spec.md идёт только
// по industry + experience_band — geo и role на Cohort не участвуют в
// поиске. Опрос SO — это в первую очередь software-разработчики, а не
// PM-специалисты (DevType="Product manager" — всего 205 строк из ~49k,
// после разбивки по industry/band выборка была бы статистически
// бессмысленной). Поэтому когорта строится по всей популяции респондентов
// как приближение "рынок труда в целом" — это и есть cold-start прокси
// из README, а не буквально PM-срез. Явно фиксируем это в role/geo, чтобы
// никто не принял их за реальные срезы.
export const COHORT_ROLE_PLACEHOLDER = "General tech workforce (unfiltered by role)";
export const COHORT_GEO_PLACEHOLDER = "Global";

export const EXPERIENCE_BANDS = ["0-2", "2-5", "5-10", "10-15", "15+"] as const;
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number];

export function experienceBandFromYears(years: number): ExperienceBand {
  if (years < 2) return "0-2";
  if (years < 5) return "2-5";
  if (years < 10) return "5-10";
  if (years < 15) return "10-15";
  return "15+";
}

// WorkExp (профессиональный опыт) точнее для нашего продукта, чем
// YearsCode (включает хобби-кодинг до первой работы) — используем как
// основное поле, YearsCode только как запасной вариант, если WorkExp не
// заполнено. Оба поля в CSV — либо число, либо строка "NA".
export function resolveExperienceYears(workExpRaw: string, yearsCodeRaw: string): number | null {
  const workExp = Number(workExpRaw.trim());
  if (workExpRaw.trim() !== "" && !Number.isNaN(workExp)) return workExp;
  const yearsCode = Number(yearsCodeRaw.trim());
  if (yearsCodeRaw.trim() !== "" && !Number.isNaN(yearsCode)) return yearsCode;
  return null;
}

// В CSV "NA" — буквальная строка для отсутствующего ответа, "Other:" —
// catch-all без расшифровки (текст уточнения не выгружен в этот столбец)
// — обе категории не образуют осмысленную когорту.
export function isUsableIndustry(industryRaw: string): boolean {
  const trimmed = industryRaw.trim();
  return trimmed !== "" && trimmed !== "NA" && trimmed !== "Other:";
}

export function cohortKey(industry: string, band: ExperienceBand): string {
  return `${industry}::${band}`;
}

// Небольшой детерминированный хэш — не для криптографии, только чтобы
// получить воспроизводимый (не меняющийся между перезапусками ETL)
// "случайный" разброс синтетических бенчмарков в диапазоне [0, 1).
function hashFraction(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

const EXPERIENCE_BAND_INDEX: Record<ExperienceBand, number> = {
  "0-2": 0,
  "2-5": 1,
  "5-10": 2,
  "10-15": 3,
  "15+": 4,
};

export interface SyntheticBenchmark {
  mean: number;
  stddev: number;
  percentileDistribution: Record<string, number>;
}

// ВНИМАНИЕ: нет вопроса в SO Survey, который просил бы оценить конкретный
// PM-навык из PAF Skill Map по шкале 1-5 — реальных данных для
// per-skill mean/stddev не существует на MVP (см. обсуждение в тикете
// приложения). Это осознанная синтетическая заглушка, а не измерение:
// - базовое среднее ниже для навыков с высоким ring_index (сеньорский/
//   редкий навык — в популяции им реже владеют глубоко);
// - базовое среднее растёт с опытным бэндом когорты;
// - детерминированный джиттер на основе (skillId, cohortKey), чтобы ETL
//   был идемпотентным (повторный запуск даёт те же числа), но соседние
//   навыки/когорты не совпадали один в один.
// percentile_distribution считается как mean + z*stddev для стандартных
// перцентилей — тоже синтетика, консистентная с mean/stddev той же строки.
// data_source ниже в ETL явно помечает эти числа как placeholder, чтобы
// это поле нельзя было спутать с реальным измерением.
export function syntheticBenchmark(
  skillId: string,
  ringIndex: number,
  ringCount: number,
  cohort: { industry: string; band: ExperienceBand },
): SyntheticBenchmark {
  const seed = `${skillId}::${cohortKey(cohort.industry, cohort.band)}`;
  const ringFactor = 1 - (ringIndex - 1) / ringCount; // выше для младших колец
  const experienceFactor = EXPERIENCE_BAND_INDEX[cohort.band] / (EXPERIENCE_BANDS.length - 1);
  const jitter = (hashFraction(seed) - 0.5) * 0.8; // [-0.4, 0.4]
  const mean = clamp(1 + 3 * (0.4 * ringFactor + 0.6 * experienceFactor) + jitter, 1, 5);
  const stddev = 0.6 + hashFraction(`${seed}::stddev`) * 0.5; // [0.6, 1.1]

  const zScores: Record<string, number> = { p10: -1.2816, p25: -0.6745, p50: 0, p75: 0.6745, p90: 1.2816 };
  const percentileDistribution: Record<string, number> = {};
  for (const [label, z] of Object.entries(zScores)) {
    percentileDistribution[label] = Number(clamp(mean + z * stddev, 1, 5).toFixed(2));
  }

  return { mean: Number(mean.toFixed(2)), stddev: Number(stddev.toFixed(2)), percentileDistribution };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
