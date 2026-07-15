# Rift Roster

A team balancer for casual League of Legends lobbies. Given 10 of a 12–15 player pool, the **Summoner Split** engine enumerates all 126 unique 5v5 splits and returns the fairest one — accounting for rank, current form, role fit, and known duo/tilt pairs. The organizer publishes the result as a **read-only link** so the whole group can see the teams before lobbying up.

See [`docs/`](docs/) for the PRD, TDD, and Roadmap.

## Stack

A hosted app with a deliberately minimal backend — the interesting part (the engine) stays client-side and pure.

- **Host/UI:** Next.js (App Router) + React + TypeScript, deployed on Vercel.
- **Engine:** pure, framework-free TypeScript in `src/engine/` — unit-tested in isolation.
- **Storage:** a KV store (Vercel KV / Upstash) holding published snapshot blobs keyed by slug. No accounts, no relational schema.
- **Sharing:** organizer publishes (gated by a single `PUBLISH_SECRET`) → gets `/v/<slug>`; anyone with the link views read-only, no login.
- **Tests:** Vitest.

> **Retired:** the original design shipped as a single offline HTML file with no backend. That constraint was dropped to allow shared read-only links — see PRD §4 (Not a goal: single offline file) and the [CHANGELOG](docs/CHANGELOG.md) for the reasoning.

## Status

**Mid-migration.** The engine model and its tests exist from the original vanilla scaffold (`src/engine.mjs`, `test/`, `team-balancer.html`); the Next.js host, publish API, and read-only view are the current work item (Roadmap v1.5). Docs are updated to the target architecture ahead of the code.

## Layout (target)

```
src/
  engine/            Summoner Split engine — pure, framework-free, tested
  app/               Next.js routes: organizer UI, /api/publish, /v/[slug] view
  components/        React UI (roster table, controls, results, meter)
  state/             roster store + localStorage sync
test/                Vitest engine tests
docs/                PRD · TDD · Roadmap
```

## Develop

```sh
# current scaffold
node --test          # run the engine tests

# after the Next.js migration
npm run dev          # local dev server
npm run test         # vitest
```

Requires Node 18+.
