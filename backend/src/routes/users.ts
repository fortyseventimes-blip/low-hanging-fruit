import type { FastifyInstance } from "fastify";
import { CareerStage } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

// Онбординг — один шаг (см. specs/onboarding/spec.md: "без промежуточного
// сохранения на сервере до завершения последнего шага"), поэтому один
// POST на весь профиль, без черновиков/патчей по мере заполнения формы.
const createUserBodySchema = {
  type: "object",
  required: ["name", "geo", "industry", "roleCurrent", "experienceYears", "resumeText", "careerStage"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    geo: { type: "string", minLength: 1 },
    industry: { type: "string", minLength: 1 },
    roleCurrent: { type: "string", minLength: 1 },
    experienceYears: { type: "integer", minimum: 0 },
    resumeText: { type: "string", minLength: 1 },
    careerStage: { type: "string", enum: Object.values(CareerStage) },
    consentedScopes: { type: "array", items: { type: "string" }, default: [] },
  },
} as const;

interface CreateUserBody {
  name: string;
  geo: string;
  industry: string;
  roleCurrent: string;
  experienceYears: number;
  resumeText: string;
  careerStage: CareerStage;
  consentedScopes?: string[];
}

export async function userRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateUserBody }>("/users", { schema: { body: createUserBodySchema } }, async (request, reply) => {
    const { name, geo, industry, roleCurrent, experienceYears, resumeText, careerStage, consentedScopes } =
      request.body;

    const user = await prisma.user.create({
      data: {
        name,
        geo,
        industry,
        roleCurrent,
        experienceYears,
        resumeText,
        careerStage,
        consentedScopes: consentedScopes ?? [],
      },
    });

    reply.code(201);
    return user;
  });
}
