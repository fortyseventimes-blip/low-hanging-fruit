import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

// README → "AI / Agent Layer": Sonnet for cheap, frequent requests; Opus
// for heavy cohort analysis. Resume extraction runs once per onboarding —
// frequent, per-user, not the heavy-analysis tier — so it's pinned to
// Sonnet per that already-locked-in product decision.
export const RESUME_EXTRACTION_MODEL = "claude-sonnet-5";
