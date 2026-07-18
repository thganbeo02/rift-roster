# Rift Roster — Roadmap

> **Author:** Zeros
> **Status:** living doc
> **Doc version:** 1.3.0
> **Audience:** Personal reference

Scoping principle for this project: **ship the balancer, defer everything that isn't proven annoying yet.** Features earn their way in by real friction observed during weekly use, not by being on a wishlist. The "why deferred" column is the important one — it's the record of *decisions*, so future me doesn't re-litigate them. When a decision is reversed, that goes in the [CHANGELOG](CHANGELOG.md) with its reasoning, not silently.

---

## ✅ v1 — Shipped (engine)

The working balancer. Enough to run a real weekly lobby.

- Roster table: name, rank bucket, main role, secondary roles (including fill), wins/games, in/out flag.
- **Summoner Split** engine: 126-split exhaustive search, optimal.
- Scoring: rankDiff + spread penalty + role fit.
- Win-rate confidence weighting (5-game floor, ramp to 20).
- Split-top-2 constraint.
- Balance meter (verdict + score gap), role badges, balance notes with outlier warnings.
- Fun mode (ARAM shuffle).
- JSON import/export as persistence.
- Hextech-console UI.

**Exit criteria met:** can go from "here's who's in" to two teams in under two minutes.

---

## 🔜 v1.5 — Hosted + shareable (current focus)

Turn the private engine into a hosted app that saves the accepted plan as a **read-only match report**. The report is the foundation for organizer history and a later confirmed Riot result.

| Item | What | Why now |
|---|---|---|
| **Hosting** | Next.js app on Vercel, deployed on `git push` | Others can't view a file on my disk. A URL is the price of shared visibility. |
| **Save + report link** | Organizer saves an accepted plan → `/v/<slug>`; anyone opens it read-only | The group sees the split before play, and the plan survives as the evidence half of a future match report. |
| **Planned-match backend** | KV records keyed by match ID/slug; one secret gates writes | Durable reports without accounts or a relational schema; engine stays client-side. |
| **localStorage working state** | Persist the in-progress roster across refreshes | Now possible (hosted), removes the weekly re-import friction the old design had. |
| **React + TypeScript + Vitest** | Migrate the vanilla scaffold to the stack in the TDD | DX for a real interactive app; keeps the pure engine unit-tested. |

**Trigger to build:** now — this is the active work item.

**Explicit guardrail:** the server may store reports and, in M6, fetch finished-game evidence from Riot on explicit organizer request. It never runs the engine, holds player accounts, or changes the saved plan.

**Milestones (the MVP path):** M1 Foundation ✅ → M2 Engine in TypeScript ✅ → M3 Organizer app ✅ → M4 Save, view & deploy. The original scaffold had no working UI to preserve — only an empty shell and a half-built engine — so the migration drops the single-file wrapper early and ports only the proven engine logic forward. Legacy removal happens inline (the wrapper in M1, the old engine file in M2), not as a separate cutover.

### ✅ M1 — Foundation

Scaffold the target toolchain and commit to the hosted app. M1 sets up the new host and removes the single-file delivery artifacts we no longer need; it ports no engine behavior yet.

1. **Create the project manifest and scripts.** Add the minimal Next.js, React, TypeScript, and Vitest packages, with scripts for development, build, typecheck, and tests.
2. **Configure TypeScript and Next.js.** Use reasonably strict TypeScript settings and the App Router. Keep configuration minimal and avoid optional runtime dependencies.
3. **Add the App Router shell.** Create the root layout and a deliberately small placeholder home page that proves the Next.js host runs; product UI belongs to M3.
4. **Create only the source boundaries M1 needs.** Establish `src/app/` now. Add `src/engine/`, `src/components/`, `src/state/`, and `src/lib/` when their first real modules land rather than committing empty directories.
5. **Configure Vitest.** Add a minimal smoke test and test configuration so the new suite runs before the engine port begins.
6. **Remove the single-file delivery artifacts.** Delete `team-balancer.html` and `build.mjs` — the hosted app replaces them. Keep `src/engine.mjs` and its `node --test` suite for now; they are the source the M2 port draws from.
7. **Document the active commands.** Keep the manual command reference in `docs/agent/code-workflow.md` accurate as scripts change.

**Exit criteria:** `npm run dev` serves the placeholder app; `npm run build`, `npm run typecheck`, and `npm run test` pass; the existing `node --test` suite still passes; and `team-balancer.html` and `build.mjs` are gone.

**Status:** complete.

### ✅ M2 — Engine in TypeScript

Bring the balancing engine into the new project as pure, framework-free TypeScript, then finish it. Port first (behavioral parity, no intentional changes), then implement the unbuilt functions one at a time — combining a language migration with new scoring logic in one step makes regressions hard to locate.

- Port `effScore`, `kCombos`, and the constants from `src/engine.mjs` into `src/engine/*.ts`; confirm parity against the existing tests.
- Implement `roleFit` (§6), `spreadPenalty` (§5b), `scoreSplit` (§5), and `balance` (§4) individually, each with focused Vitest tests — including the corrected split-top-2 regression test.
- Retire the legacy engine: delete `src/engine.mjs` and the `node --test` suite once Vitest covers everything.

**Exit criteria:** `balance()` returns an optimal split; the full Vitest suite is green; `src/engine.mjs` and `node --test` are gone; the engine has zero React/DOM/server imports.

**Status:** complete.

### ✅ M3 — Organizer app

The interface the organizer uses, built in vertical slices so each is a clean, checkable change. Consumes the engine; never reaches into it.

- Roster creation/deletion and weekly in/out selection, with Fill role support and `localStorage` persistence. Post-creation field editing is deferred until weekly use proves it necessary.
- Fresh near-optimal balancing with recent-split avoidance, team panels, assigned-role badges, balance meter, notes, copy, and rebalance.
- Forgiving JSON import/export for backup and the >10-player workflow; stable IDs survive round trips.
- Fun mode (testable ARAM shuffle), responsive organizer navigation, and development-only scenario/storage tools.

**Exit criteria:** from an empty roster, the organizer can enter players, balance, and see the teams on screen — entirely locally.

**Status:** complete.

### M4 — Save, view & deploy

Save the agreed plan as the first half of a match report, then ship it.

- ✅ Define and test the report-plan serializer as framework-free `lib/` code (rendered results only—names, ranks, roles, verdict—no raw stats).
- ✅ Add secure URL-safe slug generation and validation for per-match report links.
- Save path: the modal's **Save Team** action sends a validated planned-match record through an organizer-gated API into KV.
- Read-only report: server-rendered `/v/[slug]` shows teams, badges, meter, notes, date, and awaiting-result status; unknown slug returns 404.
- Deploy to Vercel (env vars set, `git push` deploys) and smoke-test in production.

**Exit criteria:** Save Team creates a durable planned match and unique link, and opening it on the deployed URL shows the immutable plan read-only with no login.

---

## 🔜 v1.6 — Match journal

### M5 — Organizer history & reports

Turn saved plans into an organizer-owned journal before adding any third-party dependency.

1. Define `PlannedMatch`, `MatchResult`, and `MatchReport` contracts; the plan is immutable and the result is optional.
2. Maintain a KV organizer index ordered newest-first, with `awaiting-result` and `complete` status.
3. Build Match History with compact report cards, open/copy actions, and empty/error states.
4. Build the full report in the Rift Roster design system: original score, duration/result placeholder, skill gap, and both teams ordered Top → Support.
5. Add **Use Players Again** to select the same ten stable roster IDs when available.
6. Add retention and malformed-record tests; public reports expose rendered names/results but not private organizer metadata.

**Exit criteria:** every Save Team action appears in Match History; the organizer can reopen it, copy its public link, see whether it awaits a result, and reuse the players.

### M6 — Confirmed Riot result sync

Attach finished-game evidence without exposing the Riot key or allowing automation to rewrite history.

1. Register Rift Roster in the Riot Developer Portal; prototype with a development key, then request the appropriate personal/production key for the deployed audience.
2. Extend organizer-only roster data with Riot ID (`gameName#tagLine`), platform/region, and resolved PUUID. Keep balancing rank manual.
3. Add a server-only Riot client for Account-V1 and Match-V5 with timeouts, rate-limit/error mapping, and `RIOT_API_KEY` in deployment env only.
4. On **Update Result**, search recent matches after the plan timestamp using linked PUUIDs; score candidates by participant overlap, timing, queue/map, and planned sides.
5. Present candidates to the organizer. Require confirmation before storing `matchId`, winner, start time, duration, and normalized participant sides.
6. Provide manual match-ID entry when automatic discovery is ambiguous or a player used an unlinked account.
7. Update the same public report from awaiting-result to Azure/Crimson victory while preserving the original plan byte-for-byte.
8. Add fixture-driven adapter tests; never call Riot in unit tests, client code, page rendering, or background polling.

**Exit criteria:** from an awaiting-result report, the organizer can find or enter the finished Riot match, confirm it, and see the completed public report; no API key or PUUID is exposed publicly.

---

## 🔜 v1.1 — Stronger model (still planned, after v1.5)

The three fields that most improve balance per unit of data-entry effort. Backward-compatible import (old flat-array files still load).

| Item | What | Why |
|---|---|---|
| **`peak` rank** | Peak-rank bucket, blended 70/30 with current | Direct fix for smurfs/rusty players — the outlier case that motivated the spread penalty. Cheap to collect. |
| **`adjust` nudge** | Manual −1..+2 bucket shift, applied last | Organizer override for what numbers can't see. One field, rarely changes, high leverage. |
| **`pairs`** | `together` / `apart` relationships as hard constraints | Synergy and tilt change game outcomes more than any single-player stat, and they're invisible to rank. Clean to implement — just prune the search. |
| Schema shift | Array → `{players, pairs}`, importer accepts both | Needed to carry `pairs`; keep old files working. |

**Trigger to build:** once the hosted base is running and a few lobbies confirm the model works — then add these to sharpen it.

---

## 🤔 v2 — If friction appears

Everything here is real but unproven-necessary. Each has an explicit trigger; if the trigger never fires, it never gets built.

| Item | What | Build only if… |
|---|---|---|
| **Drag-to-swap** | Move a player between teams post-balance, meter updates live, re-publish | …I'm overriding often enough that edit-and-rerun is annoying. Watch the override rate (PRD metric). |
| **Bench rotation** | `lastSatOut` → auto-suggest who sits when >10 are in | …the group stops self-managing who benches and the same junior always misses out. |
| **Recent form (last-5)** | More responsive than season WR | …games get sweaty enough that "who's hot" matters and season WR feels too sluggish. |
| **Role-weighted outliers** | Fold role-impact weights into the core score, not just warnings | …a strong jungle vs strong support keeps producing games that felt unbalanced despite equal scores. |
| **Report expiry / archive** | Hide or remove old reports | …the journal becomes noisy or storage/privacy becomes real friction. |

---

## ❄️ Deferred indefinitely (still no, for the record)

Not "later" — these are **no** unless the project's whole purpose changes.

- **Accounts / multi-user / self-service player editing / multi-group** — there is one organizer; players are viewers. Match history and Riot sync do not create player identities or editing rights.
- **Riot API rank auto-pull** — result sync does not make Riot data a balancing input. Manual rank buckets remain faster, explainable, and organizer-controlled.
- **Champion pools / KDA / CS stats** — too granular, ego-noisy, never kept current. Rank already encapsulates them.
- **In-client / live-draft integration** — the tool proposes; humans lobby up. Fine.
- **Mobile-native app** — responsive web is enough.

---

## Portfolio framing (if I ever surface this)

Even though these docs are for me, the project reads well externally as *product thinking + real algorithms + scoping judgment*:

- **Product thinking** — solves an actual behavioral problem (blowout attrition), and the hosted/shareable direction is driven by a real second-order need (visible fairness), not feature-chasing.
- **Algorithms** — optimal exhaustive search, an assignment sub-problem, a confidence-weighted scoring model, and a genuinely non-obvious variance/spread insight for outliers.
- **Full-stack** — a hosted Next.js app with a bounded backend, immutable match reports, a clean client/server split, and protected post-game API integration.
- **Scoping** — this roadmap itself: shipped lean, deferred with reasons, and recorded reversals in the CHANGELOG rather than pretending each choice was always the plan.

The one-liner: *"A hosted team balancer and match journal for my coworkers' weekly League games: agree on a fair split, share the plan, then attach the confirmed Riot result without losing what the model originally predicted."*

---

## Changelog

- **1.3.0** (2026-07-18) — Recorded M4 contract/slug progress, reframed saving around immutable planned matches, and added M5 organizer history plus M6 confirmed Riot result synchronization.
- **1.2.0** (2026-07-17) — Recorded M3 Organizer app as complete and captured its delivered persistence, fresh-balance, transfer, ARAM, and admin-tool scope.
- **1.1.1** (2026-07-16) — Recorded M2 Engine in TypeScript as complete and aligned roster roles with the implemented schema.
- **1.1.0** (2026-07-16) — Added the four-milestone hosted MVP path and recorded M1 Foundation as complete.
- **1.0.0** (2026-07-15) — Initial official version: v1.5 "Hosted + shareable" as the current focus; accounts/multi-user deferred indefinitely.
