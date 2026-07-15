# Rift Roster — Changelog

Central change history for the Rift Roster doc set and app. Each spec doc also carries its own changelog at its foot; this file is the project-level summary. Newest first.

Versioning convention (see `docs/agent/doc-workflow.md` §1 for the full rule). Doc versions are independent of git tags:
- **MAJOR** — a change that invalidates other docs or reverses a decision. In practice only the PRD and TDD reach this.
- **MINOR** — a new feature, entity, or section.
- **PATCH** — wording, clarification, or formatting that changes nothing binding.

---

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
