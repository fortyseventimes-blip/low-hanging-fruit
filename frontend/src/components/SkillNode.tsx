import { AIImpactBadge, type AiCategory } from "./AIImpactBadge";
import type { SkillNodeState } from "../lib/skill-node";

// design-brief-ui-elements.md §1: "Что НЕ делать" — always a circular
// icon-node on a dark background, never a rectangular card and never a
// 3D/isometric treatment. MSFS is the reference for node aesthetic and
// palette only, not for the map's geometry (that's PAF, see design.md).
const STATE_STYLE: Record<SkillNodeState, { border: string; opacity: string; overlay: string | null }> = {
  unassessed: { border: "border-slate-600", opacity: "opacity-60", overlay: "🔒" },
  below_cohort: { border: "border-transparent", opacity: "opacity-100", overlay: null },
  above_cohort: { border: "border-emerald-400", opacity: "opacity-100", overlay: "✓" },
  pending_confirmation: { border: "border-dashed border-slate-300", opacity: "opacity-100", overlay: "?" },
};

interface SkillNodeProps {
  name: string;
  keyQuestion: string;
  domainColor: string;
  state: SkillNodeState;
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
}

export function SkillNode({ name, keyQuestion, domainColor, state, aiCategory, aiQualityDeclining }: SkillNodeProps) {
  const style = STATE_STYLE[state];
  const fillColor = state === "unassessed" ? undefined : domainColor;

  return (
    <div className="flex w-20 flex-col items-center gap-1.5" title={keyQuestion}>
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 ${style.border} ${style.opacity}`}
        style={{ backgroundColor: fillColor ?? "#475569" }}
      >
        {style.overlay && (
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-950 bg-slate-800 text-[10px] leading-none text-slate-100">
            {style.overlay}
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-xs text-slate-300" title={name}>
        {name}
      </span>
      <AIImpactBadge aiCategory={aiCategory} aiQualityDeclining={aiQualityDeclining} />
    </div>
  );
}
