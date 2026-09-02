import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, RESUME_EXTRACTION_MODEL } from "../lib/anthropic.js";

export interface SkillCatalogEntry {
  id: string;
  name: string;
  keyQuestion: string;
  models: string;
}

const ExtractionResultSchema = z.object({
  assessments: z.array(
    z.object({
      skillName: z.string(),
      // specs/assessment-scoring/spec.md: явное совпадение с key_question —
      // "прямое"; совпадение по models/обязанностям без явного названия —
      // "косвенное", и косвенная оценка не может быть максимальной.
      evidenceType: z.enum(["direct", "indirect"]),
      rating: z.number().int().min(1).max(5),
    }),
  ),
});

export type RawExtractedAssessment = z.infer<typeof ExtractionResultSchema>["assessments"][number];

export interface ResolvedAssessment {
  skillId: string;
  inferredRating: number;
}

export function buildSystemPrompt(catalog: ReadonlyArray<SkillCatalogEntry>): string {
  const catalogLines = catalog
    .map((s) => `- "${s.name}" — key question: ${s.keyQuestion} | typical tools/models: ${s.models}`)
    .join("\n");

  return `You are analyzing a professional's free-text resume/self-description to find
evidence of Product Management skills, for a career-assessment product.

Known skills (evaluate ONLY against this exact list — skillName in your
response must match one of these names character-for-character):
${catalogLines}

For each skill where the text gives evidence of proficiency:
- "direct": the text explicitly describes doing this skill (answers the
  key question, or names it outright). Rating 1-5 reflecting apparent depth.
- "indirect": the text doesn't name the skill, but describes responsibilities
  or use of the listed tools/models that imply it. Rating must be 3 or lower
  — indirect evidence can never justify a top rating.

Only include skills with real textual evidence. Do not guess or pad the
list to look thorough — omit any skill the text doesn't support.`;
}

// Косвенная оценка не может быть максимальной (specs/assessment-scoring)
// — соблюдаем это как инвариант в коде, не полагаясь только на промпт.
export function clampRating(assessment: RawExtractedAssessment): number {
  if (assessment.evidenceType === "indirect") {
    return Math.min(assessment.rating, 3);
  }
  return assessment.rating;
}

export function resolveAssessments(
  raw: ReadonlyArray<RawExtractedAssessment>,
  catalog: ReadonlyArray<SkillCatalogEntry>,
): ResolvedAssessment[] {
  const idByName = new Map(catalog.map((s) => [s.name, s.id]));
  const resolved: ResolvedAssessment[] = [];
  for (const item of raw) {
    const skillId = idByName.get(item.skillName);
    if (!skillId) continue; // модель вернула имя вне каталога — пропускаем, не падаем
    resolved.push({ skillId, inferredRating: clampRating(item) });
  }
  return resolved;
}

export async function extractSkillEvidence(
  resumeText: string,
  catalog: ReadonlyArray<SkillCatalogEntry>,
): Promise<ResolvedAssessment[]> {
  const response = await anthropic.messages.parse({
    model: RESUME_EXTRACTION_MODEL,
    max_tokens: 4096,
    system: buildSystemPrompt(catalog),
    messages: [{ role: "user", content: resumeText }],
    output_config: { format: zodOutputFormat(ExtractionResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Claude response did not parse against the expected schema");
  }

  return resolveAssessments(response.parsed_output.assessments, catalog);
}
