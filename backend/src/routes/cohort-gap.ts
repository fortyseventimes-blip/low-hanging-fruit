import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { computeCohortGaps, selectCohort, type CohortCandidate } from "../services/cohort-scoring.js";
import type { ExperienceBand } from "../lib/experience-bands.js";

export async function cohortGapRoutes(app: FastifyInstance) {
  app.get<{ Params: { userId: string } }>(
    "/users/:userId/cohort-gap",
    { schema: { params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } } } },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }

      const cohortRows = await prisma.cohort.findMany({ select: { id: true, industry: true, experienceBand: true } });
      // Cohort.experience_band хранится как string в БД, но по построению
      // (see-survey-cohorts ETL) всегда одно из значений ExperienceBand.
      const candidates: CohortCandidate[] = cohortRows.map((c) => ({
        id: c.id,
        industry: c.industry,
        experienceBand: c.experienceBand as ExperienceBand,
      }));

      const match = selectCohort(candidates, user.industry, user.experienceYears);
      if (!match) {
        return { cohort: null, gaps: [], pendingConfirmation: [] };
      }

      const [benchmarks, assessments] = await Promise.all([
        prisma.cohortSkillBenchmark.findMany({
          where: { cohortId: match.cohort.id },
          select: { skillId: true, mean: true },
        }),
        prisma.userSkillAssessment.findMany({
          where: { userId },
          select: { skillId: true, selfRating: true, inferredRating: true, skill: { select: { name: true } } },
        }),
      ]);

      const benchmarkMeanBySkillId = new Map(benchmarks.map((b) => [b.skillId, b.mean]));
      const skillNameById = new Map(assessments.map((a) => [a.skillId, a.skill.name]));

      const { gaps, pendingConfirmation } = computeCohortGaps(assessments, benchmarkMeanBySkillId);

      return {
        cohort: {
          id: match.cohort.id,
          industry: match.cohort.industry,
          experienceBand: match.cohort.experienceBand,
          approximate: match.approximate,
        },
        gaps: gaps.map((g) => ({ ...g, skillName: skillNameById.get(g.skillId) })),
        pendingConfirmation: pendingConfirmation.map((p) => ({ ...p, skillName: skillNameById.get(p.skillId) })),
      };
    },
  );
}
