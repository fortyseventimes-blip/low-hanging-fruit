import type { AiCategory } from "../components/AIImpactBadge";
import type { StructuralBarrierType } from "../lib/structural-barrier";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function throwOnError(response: Response): Promise<void> {
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.message ?? body?.error ?? `Request failed with status ${response.status}`, response.status);
}

export interface CreateUserPayload {
  name: string;
  geo: string;
  industry: string;
  roleCurrent: string;
  experienceYears: number;
  resumeText: string;
  careerStage: string;
  consentedScopes: string[];
}

export interface User extends CreateUserPayload {
  id: string;
  createdAt: string;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await throwOnError(response);
  return response.json();
}

// Best-effort — OnboardingFlow calls this right after createUser so the
// dashboard is already populated on first load, but a failure here (e.g.
// resume too sparse, upstream API hiccup) shouldn't block the user from
// reaching their (then-mostly-unassessed) dashboard.
export async function inferSkillAssessments(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/skill-assessments/infer`, { method: "POST" });
  await throwOnError(response);
}

// specs/assessment-scoring: an inferred_rating only counts toward the
// cohort gap / roadmap once the user confirms it — these are how the
// dashboard's pending-confirmation review resolves that.
export async function confirmSkillAssessment(userId: string, skillId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/skill-assessments/${skillId}/confirm`, {
    method: "POST",
  });
  await throwOnError(response);
}

export async function rejectSkillAssessment(userId: string, skillId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/skill-assessments/${skillId}/reject`, {
    method: "POST",
  });
  await throwOnError(response);
}

export interface DashboardDomain {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
}

export interface DashboardSkillAssessment {
  skillId: string;
  selfRating: number | null;
  inferredRating: number | null;
}

export interface DashboardSkillBenchmark {
  mean: number;
  stddev: number;
}

export interface DashboardSkill {
  id: string;
  domainId: string;
  ringIndex: number;
  name: string;
  keyQuestion: string;
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
  assessment: DashboardSkillAssessment | null;
  benchmark: DashboardSkillBenchmark | null;
}

export interface DashboardConnection {
  fromSkillId: string;
  toSkillId: string;
}

export interface DashboardCohort {
  id: string;
  industry: string;
  experienceBand: string;
  approximate: boolean;
}

export interface DashboardStructuralBarrier {
  barrierType: StructuralBarrierType;
  prevalencePct: number;
  exceptionPct: number;
  roleTitle: string;
  geo: string;
}

export interface DashboardRoadmapRecommendation {
  skillId: string;
  skillName: string;
  priorityRank: number;
  rationaleText: string;
  aiCategory: AiCategory | null;
  aiQualityDeclining: boolean;
}

export interface DashboardResponse {
  profession: { domainCount: number; ringCount: number; sourceTaxonomy: string };
  domains: DashboardDomain[];
  skills: DashboardSkill[];
  connections: DashboardConnection[];
  cohort: DashboardCohort | null;
  structuralBarriers: DashboardStructuralBarrier[];
  roadmapRecommendations: DashboardRoadmapRecommendation[];
}

export async function fetchDashboard(userId: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/dashboard`);
  await throwOnError(response);
  return response.json();
}
