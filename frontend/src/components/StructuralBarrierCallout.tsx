import { buildStructuralBarrierCopy, type StructuralBarrierType } from "../lib/structural-barrier";

interface StructuralBarrierCalloutProps {
  barrierType: StructuralBarrierType;
  prevalencePct: number;
  exceptionPct: number;
  roleTitle: string;
  geo: string;
}

// design-brief-ui-elements.md §5: the one component that must NOT read as a
// warning — neutral info tone (blue/gray, "i" icon, never red/amber), and
// exception_pct always lives in the same block as the prevalence fact, not
// a smaller footnote underneath.
export function StructuralBarrierCallout({
  barrierType,
  prevalencePct,
  exceptionPct,
  roleTitle,
  geo,
}: StructuralBarrierCalloutProps) {
  const { prevalenceSentence, exceptionSentence } = buildStructuralBarrierCopy({
    barrierType,
    prevalencePct,
    exceptionPct,
    roleTitle,
    geo,
  });

  return (
    <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm">
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-400/60 text-[11px] font-semibold text-sky-400"
      >
        i
      </span>
      <p className="text-slate-300">
        {prevalenceSentence} <span className="text-slate-400">{exceptionSentence}</span>
      </p>
    </div>
  );
}
