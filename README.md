# Project Context

## Name (working title)
low-hanging-fruit — a gamified RPG-style service for assessing career
skills with cohort benchmarking.

## What it is
A B2C service that scans a person's profile (resume, LinkedIn, free-text
self-description), shows their current position in the job market
relative to a cohort (industry + role + geography + experience), 
visualizes skills as an RPG-style map (sectors + maturity rings +
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
- Visual and structural logic of the skill map — a hybrid: sectors +
  maturity rings + connections from the PAF Skill Map (Sergey Tikhomirov,
  productframework.ru, CC BY-SA 4.0, attribution required) + game-like
  node treatment from Microsoft Flight Simulator 2024 career mode
  (filled-in/grey+lock).

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
  StackExchange/Survey on GitHub) — ETL script (Python/pandas or Node)
  → Cohort / CohortSkillBenchmark tables in Postgres

### Auth / Misc
- Auth: Clerk or Auth0 (email + LinkedIn OAuth)
- Payments/affiliate: Stripe (paid consultation) + Coursera/Udemy
  affiliate links with tracking
- Analytics: PostHog
- CI/CD: GitHub Actions
- Tests: Vitest

### Explicitly NOT Used at This Stage
- Unreal Engine / any real-time 3D engine — the product is 2D data
  visualization, not a game with an environment and camera; see the chat
  discussion from 2026-09-01. Revisit only if the product evolves into a
  full 3D world with an avatar — not before several successful
  iterations.

## Conventions
- Code and commits — in English; product documents/specs — Russian is
  fine (the team's working language).
- Entity naming in the DB — snake_case; in TypeScript types — PascalCase.
- Every call to an MCP source is logged with a `fetched_at` field and a
  `freshness_window`, no exceptions.
