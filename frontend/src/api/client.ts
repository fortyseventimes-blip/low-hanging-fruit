const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? `Request failed with status ${response.status}`, response.status);
  }

  return response.json();
}
