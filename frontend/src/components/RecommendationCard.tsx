import { AIImpactBadge, type AiCategory } from "./AIImpactBadge";

interface RecommendationCardProps {
  skillName: string;
  rationaleText: string;
  priorityRank: number;
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
  resourceUrl: string;
  resourceLabel?: string;
}

// design-brief-ui-elements.md §7: one concrete next skill with a real
// (Claude-generated) rationale — LeetCode/Codewars "next task for your
// level," not a general list. CTA is a plain link to further reading, no
// affiliate params/tracking — partner monetization is explicitly out of
// scope for the MVP (proposal.md).
export function RecommendationCard({
  skillName,
  rationaleText,
  priorityRank,
  aiCategory,
  aiQualityDeclining,
  resourceUrl,
  resourceLabel = "Learn more",
}: RecommendationCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500">#{priorityRank} next skill</span>
          <h3 className="text-base font-semibold text-slate-100">{skillName}</h3>
        </div>
        <AIImpactBadge aiCategory={aiCategory} aiQualityDeclining={aiQualityDeclining} />
      </div>
      <p className="text-sm text-slate-300">{rationaleText}</p>
      <a
        href={resourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400"
      >
        {resourceLabel} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
