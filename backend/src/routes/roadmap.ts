import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { computeCohortGaps, selectCohort, type CohortCandidate } from "../services/cohort-scoring.js";
import { generateRationales, selectRoadmapCandidates, type SkillMeta } from "../services/roadmap-recommendation.js";
import type { ExperienceBand } from "../lib/experience-bands.js";

export async function roadmapRoutes(app: FastifyInstance) {
  app.post<{ Params: { userId: string } }>(
    "/users/:userId/roadmap",
    { schema: { params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } } } },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }

      const cohortRows = await prisma.cohort.findMany({ select: { id: true, industry: true, experienceBand: true } });
      const cohortCandidates: CohortCandidate[] = cohortRows.map((c) => ({
        id: c.id,
        industry: c.industry,
        experienceBand: c.experienceBand as ExperienceBand,
      }));
      const match = selectCohort(cohortCandidates, user.industry, user.experienceYears);
      if (!match) {
        return { recommendations: [] };
      }

      const skillRows = await prisma.skill.findMany({
        select: {
          id: true,
          name: true,
          keyQuestion: true,
          ringIndex: true,
          aiCategory: true,
          aiQualityStars: true,
          aiQualityDeclining: true,
          domain: { select: { profession: { select: { ringCount: true } } } },
        },
      });
      const skillsById = new Map<string, SkillMeta>(
        skillRows.map((s) => [
          s.id,
          {
            id: s.id,
            name: s.name,
            keyQuestion: s.keyQuestion,
            ringIndex: s.ringIndex,
            ringCount: s.domain.profession.ringCount,
            aiCategory: s.aiCategory,
            aiQualityStars: s.aiQualityStars,
            aiQualityDeclining: s.aiQualityDeclining,
          },
        ]),
      );

      const [benchmarks, assessments] = await Promise.all([
        prisma.cohortSkillBenchmark.findMany({
          where: { cohortId: match.cohort.id },
          select: { skillId: true, mean: true },
        }),
        prisma.userSkillAssessment.findMany({
          where: { userId },
          select: { skillId: true, selfRating: true, inferredRating: true },
        }),
      ]);
      const benchmarkMeanBySkillId = new Map(benchmarks.map((b) => [b.skillId, b.mean]));
      const { gaps } = computeCohortGaps(assessments, benchmarkMeanBySkillId);

      const candidates = selectRoadmapCandidates(gaps, skillsById, 3);
      if (candidates.length === 0) {
        return { recommendations: [] };
      }

      const rationaleBySkillId = await generateRationales(
        candidates.map((c) => ({ skill: skillsById.get(c.skillId)!, gap: c.gap })),
      );

      const recommendations = await prisma.$transaction(async (tx) => {
        await tx.roadmapRecommendation.deleteMany({ where: { userId } });
        const created = [];
        for (const [index, candidate] of candidates.entries()) {
          const skill = skillsById.get(candidate.skillId)!;
          const rationaleText =
            rationaleBySkillId.get(candidate.skillId) ??
            `${skill.name} shows the largest gap versus your cohort and holds up well against AI automation.`;
          created.push(
            await tx.roadmapRecommendation.create({
              data: { userId, skillId: candidate.skillId, priorityRank: index + 1, rationaleText },
            }),
          );
        }
        return created;
      });

      return {
        recommendations: recommendations.map((r) => ({ ...r, skillName: skillsById.get(r.skillId)!.name })),
      };
    },
  );
}
