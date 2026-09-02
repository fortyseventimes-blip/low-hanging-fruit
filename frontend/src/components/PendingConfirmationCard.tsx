interface PendingConfirmationCardProps {
  skillName: string;
  keyQuestion: string;
  inferredRating: number;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

// The dashboard's actual place to resolve a SkillNode's "?"
// pending_confirmation state (design-brief-ui-elements.md §1) — a
// scannable review list beats making the user hunt for dashed-outline
// nodes across a 71-node radial map. specs/assessment-scoring: confirming
// moves the rating to self_report (counts toward the cohort gap);
// rejecting deletes the guess outright.
export function PendingConfirmationCard({
  skillName,
  keyQuestion,
  inferredRating,
  busy,
  onConfirm,
  onReject,
}: PendingConfirmationCardProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
      <div>
        <p className="text-sm font-medium text-slate-100">{skillName}</p>
        <p className="text-xs text-slate-400">{keyQuestion}</p>
        <p className="mt-1 text-xs text-slate-500">
          We guessed a rating of {inferredRating}/5 from your resume — is that accurate?
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 disabled:opacity-40"
        >
          Not accurate
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          Yes, that's right
        </button>
      </div>
    </div>
  );
}
