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

**M3 organizer app complete.** The browser now owns roster persistence, JSON backup/restore, fresh near-optimal balancing, results, and ARAM shuffle. The publish API, read-only view, and deployment remain M4 work.

## Layout (target)

```
src/
  engine/            Summoner Split engine — pure, framework-free, tested
  app/               Next.js routes: organizer UI, /api/publish, /v/[slug] view
  components/        React UI (roster table, controls, results, meter)
  lib/               framework-free presentation and shuffle helpers
  state/             roster state, persistence, transfer, and split history
test/                Vitest engine tests
docs/                PRD · TDD · Roadmap
```

## Develop

```sh
npm run test         # Vitest suite
npm run typecheck    # TypeScript check
npm run build        # production build
npm run dev          # local development server
```

Requires Node 20+.
