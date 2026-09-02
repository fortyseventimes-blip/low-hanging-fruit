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

  // specs/assessment-scoring: подтверждение переводит предположение в
  // self_report — именно это отличает "предположение" от "факта" для
  // будущего расчёта разрыва с когортой (2.4), и именно поэтому infer()
  // выше отказывается перезаписывать self_report при повторном запуске.
  app.post<{ Params: { userId: string; skillId: string } }>(
    "/users/:userId/skill-assessments/:skillId/confirm",
    {
      schema: {
        params: {
          type: "object",
          required: ["userId", "skillId"],
          properties: { userId: { type: "string" }, skillId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { userId, skillId } = request.params;

      const existing = await prisma.userSkillAssessment.findUnique({
        where: { userId_skillId: { userId, skillId } },
      });
      if (!existing || existing.inferredRating === null) {
        reply.code(404);
        return { error: "No inferred assessment to confirm for this user/skill" };
      }

      const assessment = await prisma.userSkillAssessment.update({
        where: { userId_skillId: { userId, skillId } },
        data: {
          selfRating: existing.inferredRating,
          evidenceSource: EvidenceSource.self_report,
          assessedAt: new Date(),
        },
      });

      return { assessment };
    },
  );

  // Отклонение удаляет предположение целиком — assessment-scoring уже
  // исключает из расчёта разрыва любой resume_nlp без self_rating, так что
  // единственная причина хранить отклонённую запись — переспросить
  // пользователя повторно, а это как раз то, чего мы хотим избежать.
  app.post<{ Params: { userId: string; skillId: string } }>(
    "/users/:userId/skill-assessments/:skillId/reject",
    {
      schema: {
        params: {
          type: "object",
          required: ["userId", "skillId"],
          properties: { userId: { type: "string" }, skillId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { userId, skillId } = request.params;

      const existing = await prisma.userSkillAssessment.findUnique({
        where: { userId_skillId: { userId, skillId } },
      });
      if (!existing) {
        reply.code(404);
        return { error: "No assessment found for this user/skill" };
      }
      if (existing.evidenceSource === EvidenceSource.self_report) {
        reply.code(400);
        return { error: "Cannot reject an already-confirmed self-reported assessment" };
      }

      await prisma.userSkillAssessment.delete({ where: { userId_skillId: { userId, skillId } } });

      reply.code(204);
    },
  );
}
