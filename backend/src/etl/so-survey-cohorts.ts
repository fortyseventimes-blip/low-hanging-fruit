import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { prisma } from "../lib/prisma.js";
import {
  COHORT_GEO_PLACEHOLDER,
  COHORT_ROLE_PLACEHOLDER,
  SAMPLE_SOURCE,
  cohortKey,
  experienceBandFromYears,
  isUsableIndustry,
  resolveExperienceYears,
  syntheticBenchmark,
  type ExperienceBand,
} from "./so-survey-transform.js";

// Помечаем синтетику явно в самих данных, не только в комментарии кода —
// см. so-survey-transform.ts про причину, почему per-skill mean/stddev не
// может быть реальным измерением на этом источнике данных.
const BENCHMARK_DATA_SOURCE =
  "SO Survey 2025 — synthetic placeholder (no per-skill rating question in source survey; see so-survey-transform.ts)";

interface CohortAccumulator {
  industry: string;
  band: ExperienceBand;
  sampleSize: number;
}

async function readCohortCounts(filePath: string): Promise<Map<string, CohortAccumulator>> {
  const cohorts = new Map<string, CohortAccumulator>();
  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true }),
  );

  for await (const row of parser) {
    const industry = (row.Industry ?? "").trim();
    if (!isUsableIndustry(industry)) continue;

    const years = resolveExperienceYears(row.WorkExp ?? "", row.YearsCode ?? "");
    if (years === null) continue;

    const band = experienceBandFromYears(years);
    const key = cohortKey(industry, band);
    const existing = cohorts.get(key);
    if (existing) {
      existing.sampleSize++;
    } else {
      cohorts.set(key, { industry, band, sampleSize: 1 });
    }
  }

  return cohorts;
}

async function main() {
  const filePath = path.resolve(import.meta.dirname, "../../../data/so-survey-2025-results.csv");
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${filePath} not found. Download it first:\n` +
        `curl -o data/so-survey-2025-results.csv https://media.githubusercontent.com/media/StackExchange/Survey/main/packages/archive/2025/results.csv`,
    );
  }

  console.log("Reading and aggregating cohort counts from the SO Survey CSV...");
  const cohortCounts = await readCohortCounts(filePath);
  console.log(`Found ${cohortCounts.size} (industry, experience_band) cohorts.`);

  const skills = await prisma.skill.findMany({ select: { id: true, ringIndex: true, domain: { select: { profession: { select: { ringCount: true } } } } } });
  if (skills.length === 0) {
    throw new Error('No Skill rows found — run "npm run etl:paf" first.');
  }
  console.log(`Benchmarking against ${skills.length} existing skills.`);

  try {
    await prisma.$transaction(
      async (tx) => {
        console.log(`Wiping existing "${SAMPLE_SOURCE}" cohorts for a clean reload...`);
        await tx.cohortSkillBenchmark.deleteMany({ where: { cohort: { sampleSource: SAMPLE_SOURCE } } });
        await tx.cohort.deleteMany({ where: { sampleSource: SAMPLE_SOURCE } });

        let cohortTotal = 0;
        let benchmarkTotal = 0;
        for (const { industry, band, sampleSize } of cohortCounts.values()) {
          const cohort = await tx.cohort.create({
            data: {
              industry,
              role: COHORT_ROLE_PLACEHOLDER,
              geo: COHORT_GEO_PLACEHOLDER,
              experienceBand: band,
              sampleSource: SAMPLE_SOURCE,
              sampleSize,
            },
          });
          cohortTotal++;

          for (const skill of skills) {
            const { mean, stddev, percentileDistribution } = syntheticBenchmark(
              skill.id,
              skill.ringIndex,
              skill.domain.profession.ringCount,
              { industry, band },
            );
            await tx.cohortSkillBenchmark.create({
              data: {
                cohortId: cohort.id,
                skillId: skill.id,
                mean,
                stddev,
                percentileDistribution,
                dataSource: BENCHMARK_DATA_SOURCE,
                lastRefreshedAt: new Date(),
              },
            });
            benchmarkTotal++;
          }
        }

        console.log(`Loaded ${cohortTotal} cohorts and ${benchmarkTotal} skill benchmarks.`);
      },
      { timeout: 120_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
