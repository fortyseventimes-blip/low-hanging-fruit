import type { FastifyInstance } from "fastify";
import { EvidenceSource } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { extractSkillEvidence } from "../services/skill-extraction.js";

export async function skillAssessmentRoutes(app: FastifyInstance) {
  app.post<{ Params: { userId: string } }>(
    "/users/:userId/skill-assessments/infer",
    { schema: { params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } } } },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }

      const skills = await prisma.skill.findMany({
        select: { id: true, name: true, keyQuestion: true, models: true },
      });

      const resolved = await extractSkillEvidence(user.resumeText, skills);

      // Не перезаписываем навык, который пользователь уже подтвердил вручную
      // (self_report) — resume-инференс не должен откатывать подтверждённую
      // самооценку обратно к "предположению" (specs/assessment-scoring).
      const existing = await prisma.userSkillAssessment.findMany({
        where: { userId, skillId: { in: resolved.map((r) => r.skillId) }, evidenceSource: EvidenceSource.self_report },
        select: { skillId: true },
      });
      const confirmedSkillIds = new Set(existing.map((e) => e.skillId));
      const toUpsert = resolved.filter((r) => !confirmedSkillIds.has(r.skillId));

      const assessments = await Promise.all(
        toUpsert.map(({ skillId, inferredRating }) =>
          prisma.userSkillAssessment.upsert({
            where: { userId_skillId: { userId, skillId } },
            create: {
              userId,
              skillId,
              inferredRating,
              evidenceSource: EvidenceSource.resume_nlp,
            },
            update: {
              inferredRating,
              evidenceSource: EvidenceSource.resume_nlp,
              assessedAt: new Date(),
            },
          }),
        ),
      );

      return { assessments };
    },
  );
}
