import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../lib/anthropic.js";
import { AiCategory } from "../generated/prisma/enums.js";

export interface SkillMeta {
  id: string;
  name: string;
  keyQuestion: string;
  ringIndex: number;
  ringCount: number;
  aiCategory: AiCategory | null;
  aiQualityStars: number;
  aiQualityDeclining: boolean;
}

export interface GapInput {
  skillId: string;
  gap: number; // selfRating - cohortMean; negative = behind cohort
}

export interface RoadmapCandidate {
  skillId: string;
  gap: number;
  score: number;
}

// proposal.md, "Первая roadmap-рекомендация": 1-3 навыка с наибольшим
// отрывом от когорты (отставанием — gap < 0, т.к. рекомендация "развить
// X" бессмысленна для навыка, где человек и так выше когорты) и
// наивысшей устойчивостью к автоматизации ("не применимо" ИЛИ высокое
// человеческое качество на сеньорском кольце).
function aiResistanceScore(skill: Pick<SkillMeta, "ringIndex" | "ringCount" | "aiCategory" | "aiQualityStars">): number {
  if (skill.aiCategory === AiCategory.not_applicable) return 2;
  if (skill.ringIndex === skill.ringCount && skill.aiQualityStars >= 3) return 1;
  return 0;
}

// Навык категории "replacement" (ИИ замещает задачу целиком) никогда не
// рекомендуется для развития — это прямое противоречие продуктовому
// тезису "то, что рынок ещё ценит, а не то, что уже автоматизируется".
export function isRecommendable(skill: Pick<SkillMeta, "aiCategory">): boolean {
  return skill.aiCategory !== AiCategory.replacement;
}

export function selectRoadmapCandidates(
  gaps: ReadonlyArray<GapInput>,
  skillsById: ReadonlyMap<string, SkillMeta>,
  maxCount = 3,
): RoadmapCandidate[] {
  const behindCohort = gaps.filter((g) => g.gap < 0);

  const scored: RoadmapCandidate[] = [];
  for (const g of behindCohort) {
    const skill = skillsById.get(g.skillId);
    if (!skill || !isRecommendable(skill)) continue;
    // Композитный балл: устойчивость к ИИ — основной вес, величина
    // отставания — тай-брейк внутри одного уровня устойчивости.
    const score = aiResistanceScore(skill) * 100 - g.gap; // -g.gap положителен и растёт с отставанием
    scored.push({ skillId: g.skillId, gap: g.gap, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount);
}

const RationaleResultSchema = z.object({
  rationales: z.array(z.object({ skillName: z.string(), rationale: z.string() })),
});

export async function generateRationales(
  candidates: ReadonlyArray<{ skill: SkillMeta; gap: number }>,
): Promise<Map<string, string>> {
  if (candidates.length === 0) return new Map();

  const catalog = candidates
    .map(
      (c) =>
        `- "${c.skill.name}" — key question: ${c.skill.keyQuestion} | gap vs cohort: ${c.gap.toFixed(2)} (negative = below cohort mean) | ai_category: ${c.skill.aiCategory ?? "unknown"} | ai_quality_declining: ${c.skill.aiQualityDeclining}`,
    )
    .join("\n");

  // README → "AI / Agent Layer": Opus для тяжёлого когортного анализа —
  // именно эта задача (синтез rationale из разрыва + AI-устойчивости),
  // в отличие от частого дешёвого resume-извлечения (2.2, Sonnet).
  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: `You write short, encouraging rationale text for a career-development
roadmap recommendation. For each skill below, write ONE sentence
explaining why developing it is a good next step: reference the gap
vs the cohort and why the skill holds up against AI automation. Be
concrete, not generic — vary the phrasing per skill. Do not invent
numbers beyond what's given.

Skills to explain:
${catalog}`,
    messages: [{ role: "user", content: "Write the rationale for each skill listed above." }],
    output_config: { format: zodOutputFormat(RationaleResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Claude response did not parse against the expected schema");
  }

  const rationaleByName = new Map(response.parsed_output.rationales.map((r) => [r.skillName, r.rationale]));
  const result = new Map<string, string>();
  for (const { skill } of candidates) {
    const rationale = rationaleByName.get(skill.name);
    if (rationale) result.set(skill.id, rationale);
  }
  return result;
}
