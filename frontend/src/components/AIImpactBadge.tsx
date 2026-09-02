import { useState } from "react";

export type AiCategory = "delegation" | "mediated_via_prep" | "not_applicable" | "replacement";

// design-brief-ui-elements.md §2: 4 category colors + a separate "quality
// declining" indicator that must stay visually distinct from `replacement`
// (design.md: declining quality now is not the same as zero quality now).
const CATEGORY_META: Record<AiCategory, { color: string; label: string; explanation: string }> = {
  delegation: {
    color: "#34d399",
    label: "Delegable",
    explanation: "AI can take this off your plate — useful to know, not the priority to build further.",
  },
  mediated_via_prep: {
    color: "#f2b134",
    label: "AI-assisted prep",
    explanation: "AI helps you prepare for it, but the skill itself still matters.",
  },
  not_applicable: {
    color: "#94a3b8",
    label: "Not automatable",
    explanation: "AI doesn't reach this one — it stays a human skill.",
  },
  replacement: {
    color: "#f87171",
    label: "Being automated",
    explanation: "AI is replacing this task — not worth investing further here.",
  },
};

interface AIImpactBadgeProps {
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
}

export function AIImpactBadge({ aiCategory, aiQualityDeclining }: AIImpactBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  if (!aiCategory) return null;
  const meta = CATEGORY_META[aiCategory];

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-950"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
        {aiQualityDeclining && (
          <span aria-label="Quality declining over time" title="Quality declining over time" className="text-red-900">
            ▼
          </span>
        )}
      </button>
      {expanded && (
        <div className="absolute top-full left-1/2 z-10 mt-1 w-48 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300 shadow-lg">
          {meta.explanation}
        </div>
      )}
    </div>
  );
}
