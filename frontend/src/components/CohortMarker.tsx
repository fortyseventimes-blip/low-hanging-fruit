import { percentileFromRating, positionPct } from "../lib/cohort-marker";

interface CohortMarkerProps {
  selfRating: number;
  mean: number;
  stddev: number;
  // UserSkillAssessment.self_rating is a 1..5 scale app-wide (assessment-
  // scoring spec) — not a per-profession constant like SkillMap's
  // domain/ring counts, so a fixed default here is fine.
  min?: number;
  max?: number;
  // cohort-benchmarking spec: nearest-industry fallback must be marked as
  // an approximate comparison, not presented as an exact match.
  approximate?: boolean;
  label?: string;
}

// design-brief-ui-elements.md §4: a horizontal bar-histogram (never a
// gauge/speedometer — that distorts how a stddev reads), private
// distribution comparison, no leaderboard treatment.
export function CohortMarker({ selfRating, mean, stddev, min = 1, max = 5, approximate = false, label }: CohortMarkerProps) {
  const percentile = percentileFromRating(selfRating, mean, stddev);
  const bandStartPct = positionPct(mean - stddev, min, max);
  const bandEndPct = positionPct(mean + stddev, min, max);
  const markerPct = positionPct(selfRating, min, max);

  return (
    <div className="w-full max-w-sm">
      {label && <p className="mb-1.5 text-xs text-slate-400">{label}</p>}
      <div className="relative h-2 rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 rounded-full bg-slate-500/50"
          style={{ left: `${bandStartPct}%`, width: `${Math.max(0, bandEndPct - bandStartPct)}%` }}
          title="Cohort average ± 1 standard deviation"
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400"
          style={{ left: `${markerPct}%` }}
          title="You are here"
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-300">
        Above {percentile}% of the cohort
        {approximate && <span className="text-slate-500"> (approximate comparison)</span>}
      </p>
    </div>
  );
}
