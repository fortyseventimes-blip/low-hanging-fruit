import { useState } from "react";
import type { AiCategory } from "./AIImpactBadge";
import { ConnectionLine } from "./ConnectionLine";
import { SkillNode } from "./SkillNode";
import type { SkillNodeState } from "../lib/skill-node";
import {
  domainAngleDegrees,
  polarToPercent,
  skillPosition,
  type MapPoint,
  type RingGroupPosition,
} from "../lib/skill-map-geometry";
import { buildSkillAdjacency, connectionVisualState, isConnectionMuted, isSkillMuted } from "../lib/skill-connections";

export interface SkillMapDomain {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
}

export interface SkillMapSkill {
  id: string;
  domainId: string;
  ringIndex: number;
  name: string;
  keyQuestion: string;
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
  state: SkillNodeState;
}

export interface SkillMapConnection {
  fromSkillId: string;
  toSkillId: string;
}

interface SkillMapProps {
  // spec skill-map: "Размещение колец и секторов не зависит от профессии" —
  // domainCount/ringCount come from Profession data, never a literal here.
  domainCount: number;
  ringCount: number;
  sourceTaxonomy: string;
  domains: SkillMapDomain[];
  skills: SkillMapSkill[];
  connections: SkillMapConnection[];
}

// Rendering-only constants (not part of the angle/radius formula): how far
// out the outer ring sits from center, how much further past it labels
// sit, and how far the innermost ring is pushed out from dead center —
// all three leave room so node chrome, label text, and (with 71 real
// skills, some ring cells 7-deep) the ring-1 fan-out don't clip or crowd.
const RENDER_SCALE = 0.82;
const LABEL_RADIUS_FRACTION = 1.32;
const INNER_RADIUS_FRACTION = 0.22;

export function SkillMap({ domainCount, ringCount, sourceTaxonomy, domains, skills, connections }: SkillMapProps) {
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);

  const domainById = new Map(domains.map((domain) => [domain.id, domain]));
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const adjacency = buildSkillAdjacency(connections);
  const ringFractions = Array.from(
    { length: ringCount },
    (_, i) => (INNER_RADIUS_FRACTION + (1 - INNER_RADIUS_FRACTION) * ((i + 1) / ringCount)) * RENDER_SCALE,
  );

  // The real PAF catalog puts several skills at the same (domain, ring) —
  // e.g. up to 7 share one cell — see skill-map-geometry's RingGroupPosition.
  // Grouping here (not in the geometry lib) because it needs the full list.
  const ringGroups = new Map<string, string[]>();
  for (const skill of skills) {
    const key = `${skill.domainId}:${skill.ringIndex}`;
    const group = ringGroups.get(key);
    if (group) group.push(skill.id);
    else ringGroups.set(key, [skill.id]);
  }

  const ringGroupOf = (skill: SkillMapSkill): RingGroupPosition => {
    const group = ringGroups.get(`${skill.domainId}:${skill.ringIndex}`) ?? [skill.id];
    return { indexInRing: group.indexOf(skill.id), countInRing: group.length };
  };

  const positionOf = (skill: SkillMapSkill): MapPoint | null => {
    const domain = domainById.get(skill.domainId);
    if (!domain) return null;
    return skillPosition(
      domain.orderIndex,
      domainCount,
      skill.ringIndex,
      ringCount,
      RENDER_SCALE,
      ringGroupOf(skill),
      INNER_RADIUS_FRACTION,
    );
  };

  return (
    <div className="flex flex-col items-center gap-16 p-16">
      <div className="relative aspect-square w-full max-w-6xl">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {ringFractions.map((fraction) => (
            <circle key={fraction} cx={50} cy={50} r={fraction * 50} fill="none" stroke="#1e293b" strokeWidth={0.3} />
          ))}
          {domains.map((domain) => {
            const angle = domainAngleDegrees(domain.orderIndex, domainCount);
            const { xPct, yPct } = polarToPercent(angle, 1, RENDER_SCALE);
            return <line key={domain.id} x1={50} y1={50} x2={xPct} y2={yPct} stroke="#1e293b" strokeWidth={0.3} />;
          })}
        </svg>

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {connections.map((edge) => {
            const from = skillById.get(edge.fromSkillId);
            const to = skillById.get(edge.toSkillId);
            if (!from || !to) return null;
            const fromPos = positionOf(from);
            const toPos = positionOf(to);
            if (!fromPos || !toPos) return null;
            const bothAboveCohort = from.state === "above_cohort" && to.state === "above_cohort";
            return (
              <ConnectionLine
                key={`${edge.fromSkillId}-${edge.toSkillId}`}
                x1={fromPos.xPct}
                y1={fromPos.yPct}
                x2={toPos.xPct}
                y2={toPos.yPct}
                color={domainById.get(from.domainId)?.color ?? "#64748b"}
                state={connectionVisualState(edge, hoveredSkillId, bothAboveCohort)}
                muted={isConnectionMuted(edge, hoveredSkillId)}
              />
            );
          })}
        </svg>

        {domains.map((domain) => {
          const angle = domainAngleDegrees(domain.orderIndex, domainCount);
          const { xPct, yPct } = polarToPercent(angle, LABEL_RADIUS_FRACTION, RENDER_SCALE);
          // Anchor the label so it grows away from center instead of
          // straddling the anchor point — a centered label on the same ray
          // as that domain's outermost SkillNode would bleed back over it.
          const sinAngle = Math.sin((angle * Math.PI) / 180);
          const horizontalAnchor = sinAngle > 0.15 ? "left" : sinAngle < -0.15 ? "right" : "center";
          const anchorClass =
            horizontalAnchor === "left"
              ? "text-left"
              : horizontalAnchor === "right"
                ? "-translate-x-full text-right"
                : "-translate-x-1/2 text-center";
          return (
            <span
              key={domain.id}
              className={`absolute -translate-y-1/2 text-xs font-medium whitespace-nowrap ${anchorClass}`}
              style={{ left: `${xPct}%`, top: `${yPct}%`, color: domain.color }}
            >
              {domain.name}
            </span>
          );
        })}

        {skills.map((skill) => {
          const domain = domainById.get(skill.domainId);
          const pos = positionOf(skill);
          if (!domain || !pos) return null;
          const muted = isSkillMuted(skill.id, hoveredSkillId, adjacency);
          return (
            <div
              key={skill.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${muted ? "opacity-25" : "opacity-100"}`}
              style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
              onMouseEnter={() => setHoveredSkillId(skill.id)}
              onMouseLeave={() => setHoveredSkillId((current) => (current === skill.id ? null : current))}
            >
              <SkillNode
                name={skill.name}
                keyQuestion={skill.keyQuestion}
                domainColor={domain.color}
                state={skill.state}
                aiCategory={skill.aiCategory}
                aiQualityDeclining={skill.aiQualityDeclining}
              />
            </div>
          );
        })}
      </div>

      {/* spec skill-map: атрибуция источника обязана быть видна в футере, не
          скрыта за дополнительным кликом */}
      <p className="text-center text-xs text-slate-500">Структура адаптирована из {sourceTaxonomy}</p>
    </div>
  );
}
