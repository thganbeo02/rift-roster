# Rift Roster — Changelog

Central change history for the Rift Roster doc set and app. Each spec doc also carries its own changelog at its foot; this file is the project-level summary. Newest first.

Versioning convention (see `docs/agent/doc-workflow.md` §1 for the full rule). Doc versions are independent of git tags:
- **MAJOR** — a change that invalidates other docs or reverses a decision. In practice only the PRD and TDD reach this.
- **MINOR** — a new feature, entity, or section.
- **PATCH** — wording, clarification, or formatting that changes nothing binding.

---

## [2026-07-18] — Plan the match journal and Riot result loop — v0.6.0

Expanded Rift Roster from one-off team sharing into a staged match journal: save the accepted plan, preserve it in organizer history, and later attach a human-confirmed Riot result. The engine remains pure and client-side; the backend gains only the bounded persistence and protected post-game lookup responsibilities required by that workflow.

### Added

- Framework-free rendered-plan contract, serializer, and strict runtime validation that excludes raw wins/games, player IDs, engine internals, and unknown fields.
- Cryptographically secure nine-character URL-safe report slug generation and shared validation, with deterministic unit seams.
- Keyboard-accessible player-row context menu with disabled Edit and confirmed Delete actions.
- Planned M5 organizer history with immutable plans, awaiting-result/completed states, full match reports, share links, and player reuse.
- Planned M6 Riot integration using organizer-only Riot IDs/PUUIDs, server-side Account-V1 and Match-V5 calls, candidate matching, manual match-ID fallback, and explicit confirmation.
- Security and privacy boundaries for `RIOT_API_KEY`, PUUIDs, public reports, rate-limit handling, and fixture-only adapter tests.

### Changed

- Balanced-team rows and copied team text now follow Top → Jungle → Mid → ADC → Support order.
- Removed the Player Pool Actions column; row actions open by right-click, Shift+F10, or the context-menu key.
- Replaced the results modal's Start Over action with a disabled Save Team placeholder pending the M4 save API.
- M4 now saves each accepted split as a distinct planned match/report instead of overwriting one stable weekly snapshot.
- The backend boundary now permits planned-match persistence, organizer history operations, and explicit server-side Riot result synchronization; balancing still never runs on the server.
- Riot integration is scoped to post-game outcomes. Rank and model inputs remain manually maintained by the organizer.
- README and agent workflow now describe the match-journal architecture and its bounded server responsibilities.

### Notes

- Save Team is intentionally disabled until storage and the organizer-gated save endpoint exist; the UI does not claim an unsaved result is durable.
- Match-V5 coverage for the group's actual custom-game setup and region must be proven with real games before automatic candidate matching ships.
- Development Riot keys expire and are not a deployment strategy; the deployed audience must use the key type and disclosures approved through the Riot Developer Portal.

| Doc | Version |
|---|---|
| 01-PRD | 2.0.0 |
| 02-TDD | 2.0.0 |
| 03-Roadmap | 1.3.0 |

## [2026-07-17] — Complete the organizer app — v0.5.0

Completed M3 with an entirely client-side organizer workflow: build and persist a player pool, select the week's ten players, generate fresh near-optimal teams, inspect or copy the result, transfer roster JSON, and run an unscored ARAM shuffle. Added developer tools for quickly exercising roster and storage states.

### Added

- Hextech-themed organizer console with player creation and deletion, weekly in/out selection, Fill support, and localStorage persistence.
- Balanced-team results with assigned roles, a human-readable balance meter, model-estimate language, clipboard output, visible errors, and stale-result handling.
- Formatted JSON export plus safe import of the current object shape and legacy bare arrays without replacing the roster on validation failure.
- Pure, injected-randomness ARAM shuffle for exactly ten selected players, presented as simple numbered team lists without balance scores.
- Draft Settings admin tools for generated players, scenario presets, selection controls, and storage inspection.
- Unit coverage for roster state, persistence, transfer, balance history, admin scenarios, ARAM shuffling, balance presentation, and candidate ranking.

### Changed

- The UI chooses among near-optimal engine candidates and avoids recently used split signatures for the same player cohort, so Balance and Rebalance can produce fresh teams without accepting extra off-role assignments.
- JSON exports retain stable player IDs so round trips preserve roster identity and balance history.
- README, PRD, TDD, and Roadmap now describe M3 as complete and M4 publishing as the next milestone.

### Notes

- Editing an existing manual player and editing wins/games after creation remain intentionally deferred.
- The balancing engine and organizer working state remain in the browser; no backend behavior was added.

| Doc | Version |
|---|---|
| 01-PRD | 1.2.0 |
| 02-TDD | 1.2.0 |
| 03-Roadmap | 1.2.0 |

## [2026-07-16] — Complete the TypeScript balancing engine — v0.4.0

Completed M2 by porting the proven engine behavior to pure TypeScript and implementing the full optimal 5v5 search. The engine now scores aggregate strength, team spread, and deterministic role assignments, exposes a typed public API, and is exercised end to end against the current roster.

### Added

- Pure TypeScript engine modules for constants, effective score, combinations, role fit, spread penalty, split scoring, and exhaustive balance search.
- Typed public contracts for players, options, assignments, score breakdowns, team evaluations, and balance results.
- Correct split-top-two enforcement for strongest players sharing either Team A or Team B, with regression coverage.
- Vitest coverage for scoring boundaries, 120-permutation role assignment, 126 unique splits, deterministic ties, validation, input immutability, and the real-roster flow.
- Worked balance example showing the recommended teams and the full score calculation with Van Hai excluded.
- `@/` source alias support in TypeScript and Vitest.

### Changed

- Player IDs are stable strings, and `secondaryRoles` is an array so fill players can express every acceptable non-main role.
- Organizer-only availability is separated from the pure engine player contract as `RosterPlayer` in the TDD.
- README, Roadmap, and agent workflow now treat the TypeScript engine and Vitest suite as current state; M2 is complete and M3 is next.

### Removed

- Legacy `src/engine.mjs` and its `node --test` suite after parity and integration coverage moved to Vitest.

### Notes

- The real-roster fixture keeps wins and games at zero rather than fabricating form data.
- Van Thu and Trung Thanh use documented provisional rank assumptions until current ranks are known.

| Doc | Version |
|---|---|
| 01-PRD | 1.1.0 |
| 02-TDD | 1.1.0 |
| 03-Roadmap | 1.1.1 |

## [2026-07-16] — Scaffold the hosted foundation — v0.3.0

Established the Next.js host and its TypeScript/Vitest verification baseline, completing M1 of the hosted migration. Removed the retired single-file delivery wrapper while retaining the legacy engine and its tests as the behavioral source for the M2 TypeScript port.

### Added

- Next.js App Router shell with root metadata, placeholder home page, and minimal global styling.
- TypeScript, Vitest, and npm project configuration with a reproducible lockfile.
- Manual development, test, typecheck, and build commands in the code workflow and README.
- Four-milestone hosted MVP breakdown in the Roadmap.

### Changed

- Runtime verification now targets the running hosted app instead of the retired offline file.
- README and agent guidance now describe the active Next.js foundation and transitional legacy engine accurately.

### Removed

- `team-balancer.html` and `build.mjs`; the hosted Next.js shell now owns delivery.

### Notes

- `src/engine.mjs` and its six Node tests remain temporarily as the parity baseline for M2.
- The dependency audit reports a moderate PostCSS advisory through Next.js; npm's offered forced fix is a breaking downgrade, so it is deferred pending an upstream-compatible release.

| Doc | Version |
|---|---|
| 03-Roadmap | 1.1.0 |

## [2026-07-15] — Rewrite docs for hosted + shareable direction — v0.2.0

Moved the product from a single offline HTML file toward a hosted app with a deliberately minimal snapshot backend, so the whole group can view each week's teams through a read-only link. Kept the balancing engine client-side and pure — the reversal is contained to storage, not the model. Also stood up the agent workflow: operating rules, this changelog, per-doc changelogs, and a doc-workflow module.

### Added

- `AGENTS.md` operating rules: non-negotiable constraints, git workflow (commit-message template, human-only commit/push), pre-commit checklist, and routing to task modules.
- `docs/agent/` task modules: `doc-workflow.md` (doc versioning, per-doc changelogs, project changelog format, wrap-up ritual) and `code-workflow.md` (coding conventions and engine-purity rules).
- `docs/CHANGELOG.md` (this file) and a per-doc changelog at the foot of each spec.
- TDD sections for the snapshot backend, hosting/deployment, and security/privacy.
- PRD "Viewers" user class and the shareable read-only link as a first-class deliverable.

### Changed

- Rewrote the PRD, TDD, and Roadmap for the hosted + shareable direction. Docs now read as current-state truth; change history lives in the changelogs instead of inline dated notes.
- Product direction moved from a single offline HTML file to a hosted app with a minimal backend; the engine stays client-side.
- Target stack moved from vanilla single-file to Next.js + React + TypeScript on Vercel, with a KV store for snapshots.

### Deprecated

- `team-balancer.html` and `build.mjs` (the single-file scaffold) — superseded by the Next.js host, pending removal once the migration lands.

### Fixed

- Split-top-2 constraint in the TDD now skips when the two strongest players share a team (both in or both out of the combo), closing the both-in-teamB gap.
- Pinned the previously-undefined `spreadWeight` scoring term to `1`.

### Notes

- The balancing model itself is unchanged; this was an architecture and documentation change, not a balancing change.
- Accounts / multi-user / self-service editing remain explicitly out of scope — the line the backend reversal deliberately did not cross.

| Doc | Version |
|---|---|
| 01-PRD | 1.0.0 |
| 02-TDD | 1.0.0 |
| 03-Roadmap | 1.0.0 |

## [2026-07-15] — Initial scaffold and engine core — v0.1.0

Set up the project, the Summoner Split engine core, an eyeball-able test suite, and the original single-file design docs. Enough to compute a balanced split locally.

### Added

- Project scaffold: `team-balancer.html`, `build.mjs` inliner, `sample-roster.json`, `.gitignore`.
- Summoner Split engine core (`src/engine.mjs`): `RANKS`, `ROLES`, role/impact weights, `effScore` (form + peak + adjust), `kCombos`.
- Engine unit tests via `node --test` (6 passing).
- Product docs: PRD, TDD, Roadmap (original single-file design; drafts — official doc versioning begins at 1.0.0 in the v0.2.0 entry).
- Git repository, pushed to [github.com/thganbeo02/rift-roster](https://github.com/thganbeo02/rift-roster).
