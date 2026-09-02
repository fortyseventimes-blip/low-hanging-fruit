export interface SkillConnectionEdge {
  fromSkillId: string;
  toSkillId: string;
}

// design-brief-ui-elements.md §3 / spec skill-map: hovering a node activates
// its *direct* connections only (roadmap.sh-style), not the whole path —
// so adjacency only needs one hop in each direction.
export function buildSkillAdjacency(connections: SkillConnectionEdge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const { fromSkillId, toSkillId } of connections) {
    if (!adjacency.has(fromSkillId)) adjacency.set(fromSkillId, new Set());
    if (!adjacency.has(toSkillId)) adjacency.set(toSkillId, new Set());
    adjacency.get(fromSkillId)?.add(toSkillId);
    adjacency.get(toSkillId)?.add(fromSkillId);
  }
  return adjacency;
}

export function isSkillMuted(
  skillId: string,
  hoveredSkillId: string | null,
  adjacency: Map<string, Set<string>>,
): boolean {
  if (hoveredSkillId === null || skillId === hoveredSkillId) return false;
  return !adjacency.get(hoveredSkillId)?.has(skillId);
}

export type ConnectionVisualState = "default" | "active" | "passed";

export function isConnectionActive(edge: SkillConnectionEdge, hoveredSkillId: string | null): boolean {
  return hoveredSkillId !== null && (edge.fromSkillId === hoveredSkillId || edge.toSkillId === hoveredSkillId);
}

export function isConnectionMuted(edge: SkillConnectionEdge, hoveredSkillId: string | null): boolean {
  return hoveredSkillId !== null && !isConnectionActive(edge, hoveredSkillId);
}

export function connectionVisualState(
  edge: SkillConnectionEdge,
  hoveredSkillId: string | null,
  bothEndsAboveCohort: boolean,
): ConnectionVisualState {
  if (isConnectionActive(edge, hoveredSkillId)) return "active";
  if (bothEndsAboveCohort) return "passed";
  return "default";
}
