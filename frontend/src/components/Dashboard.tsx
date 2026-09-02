import { useEffect, useState } from "react";
import {
  confirmSkillAssessment,
  fetchDashboard,
  rejectSkillAssessment,
  type DashboardResponse,
} from "../api/client";
import { CohortMarker } from "./CohortMarker";
import { PendingConfirmationCard } from "./PendingConfirmationCard";
import { RecommendationCard } from "./RecommendationCard";
import { SkillMap, type SkillMapConnection, type SkillMapDomain, type SkillMapSkill } from "./SkillMap";
import { StructuralBarrierCallout } from "./StructuralBarrierCallout";
import { deriveSkillNodeState } from "../lib/skill-node";

interface DashboardProps {
  userId: string;
}

// A plain, non-tracking "read more" link built from the skill name — the
// backend doesn't curate a resourceUrl per recommendation (proposal.md:
// partner monetization is out of scope for the MVP), so this is the
// simplest honest stand-in per RecommendationCard's brief (§7).
function resourceUrlFor(skillName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(skillName)}`;
}

export function Dashboard({ userId }: DashboardProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySkillIds, setBusySkillIds] = useState<Set<string>>(new Set());
  const [pendingActionError, setPendingActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load your skill map.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function resolvePendingSkill(skillId: string, action: (userId: string, skillId: string) => Promise<void>) {
    setPendingActionError(null);
    setBusySkillIds((prev) => new Set(prev).add(skillId));
    try {
      await action(userId, skillId);
      setData(await fetchDashboard(userId));
    } catch (err) {
      setPendingActionError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setBusySkillIds((prev) => {
        const next = new Set(prev);
        next.delete(skillId);
        return next;
      });
    }
  }

  if (error) {
    return <p className="mx-auto max-w-md px-6 py-16 text-center text-sm text-red-400">{error}</p>;
  }
  if (!data) {
    return <p className="mx-auto max-w-md px-6 py-16 text-center text-sm text-slate-400">Loading your skill map…</p>;
  }

  const domains: SkillMapDomain[] = data.domains;
  const connections: SkillMapConnection[] = data.connections;
  const skillById = new Map(data.skills.map((skill) => [skill.id, skill]));
  const pendingSkills = data.skills.filter(
    (skill) => skill.assessment?.selfRating == null && skill.assessment?.inferredRating != null,
  );

  const skills: SkillMapSkill[] = data.skills.map((skill) => ({
    id: skill.id,
    domainId: skill.domainId,
    ringIndex: skill.ringIndex,
    name: skill.name,
    keyQuestion: skill.keyQuestion,
    aiCategory: skill.aiCategory,
    aiQualityDeclining: skill.aiQualityDeclining,
    state: deriveSkillNodeState(skill.assessment, skill.benchmark),
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
      <SkillMap
        domainCount={data.profession.domainCount}
        ringCount={data.profession.ringCount}
        sourceTaxonomy={data.profession.sourceTaxonomy}
        domains={domains}
        skills={skills}
        connections={connections}
      />

      {pendingSkills.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-400">Confirm what we inferred from your resume</h2>
          {pendingActionError && <p className="text-xs text-red-400">{pendingActionError}</p>}
          {pendingSkills.map((skill) => (
            <PendingConfirmationCard
              key={skill.id}
              skillName={skill.name}
              keyQuestion={skill.keyQuestion}
              inferredRating={skill.assessment!.inferredRating!}
              busy={busySkillIds.has(skill.id)}
              onConfirm={() => resolvePendingSkill(skill.id, confirmSkillAssessment)}
              onReject={() => resolvePendingSkill(skill.id, rejectSkillAssessment)}
            />
          ))}
        </div>
      )}

      {data.structuralBarriers.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-400">Worth knowing</h2>
          {data.structuralBarriers.map((barrier) => (
            <StructuralBarrierCallout
              key={barrier.barrierType}
              barrierType={barrier.barrierType}
              prevalencePct={barrier.prevalencePct}
              exceptionPct={barrier.exceptionPct}
              roleTitle={barrier.roleTitle}
              geo={barrier.geo}
            />
          ))}
        </div>
      )}

      {data.roadmapRecommendations.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-400">Your next steps</h2>
          {data.roadmapRecommendations.map((rec) => {
            const skill = skillById.get(rec.skillId);
            const selfRating = skill?.assessment?.selfRating ?? null;
            return (
              <div key={rec.skillId} className="flex flex-col gap-2">
                <RecommendationCard
                  priorityRank={rec.priorityRank}
                  skillName={rec.skillName}
                  rationaleText={rec.rationaleText}
                  aiCategory={rec.aiCategory}
                  aiQualityDeclining={rec.aiQualityDeclining}
                  resourceUrl={resourceUrlFor(rec.skillName)}
                />
                {selfRating !== null && skill?.benchmark && (
                  <CohortMarker
                    label="You vs. cohort on this skill"
                    selfRating={selfRating}
                    mean={skill.benchmark.mean}
                    stddev={skill.benchmark.stddev}
                    approximate={data.cohort?.approximate ?? false}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
