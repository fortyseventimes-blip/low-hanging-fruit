# Pilot Checklist (tasks.md 4.1 / 4.2)

Facilitator's guide for running the 10–15 person pilot and capturing the
4.2 metric: **% of participants who confirmed at least one "unexpected"
`inferred_rating` as accurate.**

"Unexpected" isn't something the app tracks automatically — it's a
judgment call the participant makes out loud during the session. This
checklist exists to make sure that moment actually gets captured.

---

## 0. One-time setup — do this before the first session, not during it

- [ ] App runs locally end to end — see `README.md` → "Running Locally".
- [ ] **`ANTHROPIC_API_KEY` in `backend/.env` is valid.** Verify with a
      throwaway test: sign up through onboarding with a real-ish resume
      and confirm skills actually get inferred (some nodes should be
      colored/dashed, not everything grey-locked). A stale key fails
      *silently* — onboarding still completes, the dashboard still loads,
      it's just empty. Nothing in the UI tells you the key is bad. Do not
      discover this mid-pilot.
- [ ] DB is seeded: `npm run etl:paf`, `npm run etl:so-survey` (needs the
      raw CSV — see README), `npm run seed:pilot-role`. Confirm a cohort
      actually matches for your participants' industry (`Software
      Development` is the only one guaranteed seeded end-to-end alongside
      the pilot `RoleProfile` — "Product Analyst" / Germany).
- [ ] Decide session format (screen-share / in-person / participant drives
      solo while you observe) and how you'll record it (notes vs.
      recording — get consent either way).
- [ ] Have the tracking sheet ready (§3 below) — one row per participant,
      filled in live during the session, not reconstructed after.

## 1. Recruiting (target segment, from `README.md`)

- Senior professionals on a career plateau (~30–35) **or** people in a
  prolonged job search — primarily IT/product.
- Comfortable with gamified interfaces and sharing personal data (resume
  text gets sent to Claude for skill inference — say this up front).
- 10–15 participants total.

## 2. Per-session script

1. **Frame it** (~1 min): "This estimates your skills against people
   similar to you and suggests what to focus on next. I'll ask you to
   think out loud, especially when you see a skill rating we guessed for
   you." Get explicit consent for the resume-analysis step (the
   onboarding form's own consent checkbox covers the API call, but say it
   out loud too).
2. **Time the onboarding** (spec target: ≤7 min). Note the actual time —
   a large overrun on its own is a finding worth logging even without
   asking.
3. **Let the dashboard load**, then walk to the **"Confirm what we
   inferred from your resume"** section — this is the part that matters
   for 4.2. For *each* card shown:
   - Ask: **"Does this rating look right to you?"** — before they click
     anything.
   - Ask: **"Would you have guessed we'd say that about you?"** — this is
     the "unexpected" judgment call. Log it (§3) regardless of which way
     they answer.
   - Only then let them click **Confirm** or **Not accurate**.
   - If there's nothing in that section (no pending skills — can happen
     if inference came back empty or everything was already confirmed),
     note that too; it's a valid but different outcome, not a skipped step.
4. **Let them explore the rest** unprompted for a couple minutes: the
   skill map (hover a connected node — does the highlighting make sense
   to them?), the structural-barrier callout (does the tone land as
   informational, not judgmental?), the recommendation cards.
5. **Exit questions** (open-ended, capture verbatim where you can):
   - "Anything on this screen surprise you?"
   - "Would you act on the next-step recommendation?"
   - "Anything that would stop you from coming back to this?"

## 3. Tracking sheet (one row per participant)

| Field | Notes |
|---|---|
| Participant ID | anonymized, not their real name in the sheet |
| Date | |
| Segment fit (Y/N) | plateaued senior / prolonged search / neither |
| Onboarding time | vs. the ≤7 min target |
| # pending-confirmation skills shown | 0 is a valid, loggable outcome |
| # confirmed | |
| # rejected | |
| # confirmed **AND** called "unexpected" out loud | **this is the numerator for 4.2** |
| Notable quotes | exit-question answers, anything said mid-review |

## 4. Computing 4.2 at the end

```
4.2 = (# participants with ≥1 "confirmed AND unexpected" row > 0) / (total participants)
```

Not the same as "# confirmations that were unexpected" summed across
everyone — it's whether *each participant* had that moment at least once.

## 5. Known gaps to keep in mind while reading results

- Roadmap recommendations (`POST /users/:userId/roadmap`) aren't
  triggered automatically anywhere in the app yet — a participant's
  "Your next steps" section will be empty unless someone calls that
  endpoint for them first (e.g. via `curl`) after their onboarding
  completes. Decide before the pilot whether recommendations are in
  scope for these sessions; if so, trigger it right after their resume
  inference finishes.
- Cohort match quality varies by `industry` string — it must match a
  seeded `Cohort.industry` value exactly (`Software Development` is
  known-good) or the comparison falls back to `approximate: true` (still
  useful, just say so if a participant asks why it's marked approximate).
