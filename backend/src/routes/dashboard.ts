import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { selectCohort, type CohortCandidate } from "../services/cohort-scoring.js";
import type { ExperienceBand } from "../lib/experience-bands.js";

// Aggregate read for the post-onboarding screen: the full skill catalog
// (profession/domains/skills/connections — global, not user-specific, but
// there's exactly one seeded Profession on this MVP so serving it per-user
// here avoids a second round trip) plus this user's assessments, matched
// cohort benchmarks, structural barriers, and any roadmap recommendations
// already generated (2.5's POST endpoint creates those — this route only
// reads, it never calls Claude).
export async function dashboardRoutes(app: FastifyInstance) {
  app.get<{ Params: { userId: string } }>(
    "/users/:userId/dashboard",
    { schema: { params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } } } },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }

      const profession = await prisma.profession.findFirst({
        include: { domains: { include: { skills: true }, orderBy: { orderIndex: "asc" } } },
      });
      if (!profession) {
        reply.code(500);
        return { error: "No Profession seeded" };
      }

      const domains = profession.domains;
      const skills = domains.flatMap((d) => d.skills);
      const skillIds = skills.map((s) => s.id);

      const [connections, assessments, cohortRows, barriers, roadmapRows] = await Promise.all([
        prisma.skillConnection.findMany({
          where: { fromSkillId: { in: skillIds } },
          select: { fromSkillId: true, toSkillId: true },
        }),
        prisma.userSkillAssessment.findMany({
          where: { userId },
          select: { skillId: true, selfRating: true, inferredRating: true },
        }),
        prisma.cohort.findMany({ select: { id: true, industry: true, experienceBand: true } }),
        // specs/onboarding, "Гео и индустрия определяют набор структурных
        // барьеров": only the barriers for a role matching this user's own
        // industry + geo, never the whole table.
        prisma.structuralBarrier.findMany({
          where: { roleProfile: { industry: user.industry, geo: user.geo } },
          include: { roleProfile: { select: { title: true, geo: true } } },
        }),
        prisma.roadmapRecommendation.findMany({
          where: { userId },
          orderBy: { priorityRank: "asc" },
          include: { skill: { select: { name: true, aiCategory: true, aiQualityDeclining: true } } },
        }),
      ]);

      const cohortCandidates: CohortCandidate[] = cohortRows.map((c) => ({
        id: c.id,
        industry: c.industry,
        experienceBand: c.experienceBand as ExperienceBand,
      }));
      const match = selectCohort(cohortCandidates, user.industry, user.experienceYears);

      const benchmarksBySkillId = new Map<string, { mean: number; stddev: number }>();
      if (match) {
        const benchmarks = await prisma.cohortSkillBenchmark.findMany({
          where: { cohortId: match.cohort.id, skillId: { in: skillIds } },
          select: { skillId: true, mean: true, stddev: true },
        });
        for (const b of benchmarks) benchmarksBySkillId.set(b.skillId, { mean: b.mean, stddev: b.stddev });
      }

      const assessmentBySkillId = new Map(assessments.map((a) => [a.skillId, a]));

      return {
        profession: {
          domainCount: domains.length,
          ringCount: profession.ringCount,
          sourceTaxonomy: profession.sourceTaxonomy,
        },
        domains: domains.map((d) => ({ id: d.id, name: d.name, color: d.color, orderIndex: d.orderIndex })),
        skills: skills.map((s) => ({
          id: s.id,
          domainId: s.domainId,
          ringIndex: s.ringIndex,
          name: s.name,
          keyQuestion: s.keyQuestion,
          aiCategory: s.aiCategory,
          aiQualityDeclining: s.aiQualityDeclining,
          assessment: assessmentBySkillId.get(s.id) ?? null,
          benchmark: benchmarksBySkillId.get(s.id) ?? null,
        })),
        connections,
        cohort: match
          ? {
              id: match.cohort.id,
              industry: match.cohort.industry,
              experienceBand: match.cohort.experienceBand,
              approximate: match.approximate,
            }
          : null,
        structuralBarriers: barriers.map((b) => ({
          barrierType: b.barrierType,
          prevalencePct: b.prevalencePct,
          exceptionPct: b.exceptionPct,
          roleTitle: b.roleProfile.title,
          geo: b.roleProfile.geo,
        })),
        roadmapRecommendations: roadmapRows.map((r) => ({
          skillId: r.skillId,
          skillName: r.skill.name,
          priorityRank: r.priorityRank,
          rationaleText: r.rationaleText,
          aiCategory: r.skill.aiCategory,
          aiQualityDeclining: r.skill.aiQualityDeclining,
        })),
      };
    },
  );
}
