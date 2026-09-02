# Project Context

## Name (working title)
low-hanging-fruit — a gamified RPG-style service for assessing career
skills with cohort benchmarking.

## What it is
A B2C service that scans a person's profile (resume, LinkedIn, free-text
self-description), shows their current position in the job market
relative to a cohort (industry + role + geography + experience),
visualizes skills as an RPG-style map (domains + maturity rings +
connections between skills), and builds a development roadmap that
accounts for which skills the market still values and which are already
being automated by AI.

## Target Segment (pilot)
Senior professionals on a career plateau (30–35 years old) and people in
a prolonged job search, primarily in IT/product — this segment is already
accustomed to gamification (gaming) and to sharing personal data.

## Key Product Decisions (locked in)
- Not a static database — an agent layer on top of the DB that queries
  external sources (MCP) at request time, with caching and freshness
  windows.
- Monetization: affiliate commissions from courses (20–30% as a target
  range) + a fast track to a paid consultation.
- Formal market requirements (degree, certification) and social capital
  (network, public speaking) are NOT a filtering criterion but a
  statistical probability factor, shown together with exceptions
  ("here are people who got into the role without this").
- Cold-start data — the Stack Overflow Developer Survey 2025 (~49,000
  developers, ODbL license, attribution required) instead of waiting to
  accumulate an own user base.
- **Skill map structure vs. visual style are decoupled.** The data logic
  (domains + maturity rings + connections between skills) is adapted from
  the PAF Skill Map (Sergey Tikhomirov, productframework.ru, CC BY-SA 4.0,
  attribution required). The visual aesthetic is Microsoft Flight
  Simulator 2024 career mode: dark background, circular icon nodes,
  concentric maturity rings, filled-in+checkmark ("mastered") vs.
  grey+lock ("locked") states — see
  `openspec/changes/add-mvp-skill-assessment/design-brief-ui-elements.md`.
  (A dark "constellation" alternative was considered on 2026-09-02 and
  rejected in favor of the MSFS direction — see `references.md`.)
- **Domain and ring placement is profession-agnostic by construction.**
  Angle and radius on the map are pure functions of
  `Profession.domain_count` / `Profession.ring_count` — not hardcoded to
  Product Management's 6 domains / 3 rings. Switching to a different
  profession (e.g. marketing, sales) means adding rows to `Profession` /
  `SkillDomain`, not changing rendering code. This holds regardless of
  which visual skin is drawn on top. See `design.md` for the `Profession`
  / `SkillDomain` entities and the exact formulas.

## Stack (locked in for MVP)

### Frontend
- React + TypeScript, built with Vite
- D3.js (or plain SVG, no separate canvas engine) — skill map rendering
- Tailwind CSS — styling
- Hosting: Vercel or GitHub Pages (the same pattern already used for the
  Telegram bot game)

### Backend
- Node.js + TypeScript, Express or Fastify
- PostgreSQL + Prisma ORM — relational model, needed for aggregate cohort
  queries (percentile, stddev across slices)
- Redis (or a separate Postgres table with a timestamp) — cache for
  agent-layer responses with freshness windows (trends — weekly, salaries
  — monthly)

### AI / Agent Layer
- Claude API — Sonnet for cheap, frequent requests; Opus for heavy
  cohort analysis
- MCP servers — job board API, salary data, Google Trends (via a
  wrapper); every call is logged with a "source + data date" field
- Source rule: structured APIs with a data-update-date field only, no
  scraping of arbitrary websites; if a source is older than 6 months,
  show a visual flag to the user

### Cold-Start Data
- Stack Overflow Developer Survey 2025 (results.csv from
  StackExchange/Survey on GitHub) — ETL script (`backend/src/etl/so-survey-cohorts.ts`,
  run via `npm run etl:so-survey`) → `Cohort` / `CohortSkillBenchmark`
  tables in Postgres. `Cohort` (industry × experience_band, real sample
  sizes) is a genuine aggregate of the survey; `CohortSkillBenchmark`
  (per-skill mean/stddev) is a documented synthetic placeholder, since
  the survey has no question that rates a specific PAF skill — see
  `design.md` → "Ключевые решения дизайна данных" for why, and
  `backend/src/etl/so-survey-transform.ts` for the exact formula.
  The raw CSV (~140MB, Git LFS on the upstream repo) is gitignored —
  fetch it with:
  `curl -o data/so-survey-2025-results.csv https://media.githubusercontent.com/media/StackExchange/Survey/main/packages/archive/2025/results.csv`

### Auth / Misc
- Auth: Clerk or Auth0 (email + LinkedIn OAuth)
- Payments/affiliate: Stripe (paid consultation) + Coursera/Udemy
  affiliate links with tracking
- Analytics: PostHog
- CI/CD: GitHub Actions
- Tests: Vitest

### Explicitly NOT Used at This Stage
- Unreal Engine / any real-time 3D engine — the product is 2D data
  visualization, not a game with an environment and camera. Revisit only
  if the product evolves into a full 3D world with an avatar — not before
  several successful iterations.

## Conventions
- Code and commits — in English; product documents/specs — Russian is
  fine (the team's working language).
- Entity naming in the DB — snake_case; in TypeScript types — PascalCase.
- Every call to an MCP source is logged with a `fetched_at` field and a
  `freshness_window`, no exceptions.
- Rendering logic (domain angle, ring radius) must never contain
  profession-specific constants — see `openspec/changes/add-mvp-skill-assessment/specs/skill-map/spec.md`,
  "Размещение колец и секторов не зависит от профессии".

## Where to look next
- `openspec/changes/add-mvp-skill-assessment/proposal.md` — scope of the
  current MVP change
- `openspec/changes/add-mvp-skill-assessment/design.md` — full entity
  model (`User`, `Skill`, `Profession`, `SkillDomain`, `Cohort`, etc.)
- `openspec/changes/add-mvp-skill-assessment/design-brief-ui-elements.md`
  — component-level design brief (SkillNode, ConnectionLine,
  CohortMarker, etc.) and the MSFS-style visual system (dark background,
  circular icon nodes, filled+checkmark vs. grey+lock states)
- `openspec/changes/add-mvp-skill-assessment/references.md` — design and
  market references
- `data/PAF_Skill_Map_database.xlsx` — seed data for the ETL step
  (71 skills extracted from the PAF Skill Map)
