# Rift Roster

A team balancer and match journal for casual League of Legends lobbies. Given 10 of a 12–15 player pool, the **Summoner Split** engine enumerates all 126 unique 5v5 splits and returns the fairest one. The organizer saves the agreed plan, shares it read-only, and can later attach the real Riot result to preserve a match report.

See [`docs/`](docs/) for the PRD, TDD, and Roadmap.

## Stack

A hosted app with a bounded backend—the interesting part (the engine) stays client-side and pure.

- **Host/UI:** Next.js (App Router) + React + TypeScript, deployed on Vercel.
- **Engine:** pure, framework-free TypeScript in `src/engine/` — unit-tested in isolation.
- **Storage:** a KV store (Vercel KV / Upstash) holding planned matches, public report snapshots, and an organizer match index. No accounts or relational schema.
- **Sharing:** organizer saves a match plan (gated by `PUBLISH_SECRET`) → gets `/v/<slug>`; anyone with the link views read-only, no login.
- **Results (planned):** explicit organizer action triggers a server-side Riot Match-V5 lookup; `RIOT_API_KEY` never reaches the browser.
- **Tests:** Vitest.

> **Retired:** the original design shipped as a single offline HTML file with no backend. That constraint was dropped to allow shared read-only links — see PRD §4 (Not a goal: single offline file) and the [CHANGELOG](docs/CHANGELOG.md) for the reasoning.

## Status

**M3 organizer app complete; M4 in progress.** Report-plan contracts plus secure slug generation/validation are implemented. Per-match slug minting, saving, the read-only report, storage, and deployment remain M4 work; organizer history and Riot result synchronization follow in M5–M6.

## Layout (target)

```
src/
  engine/            Summoner Split engine — pure, framework-free, tested
  app/               Next.js routes: organizer UI, match APIs, /v/[slug] report
  components/        React UI (roster table, controls, results, meter)
  lib/               framework-free presentation and shuffle helpers
  state/             roster, organizer persistence, transfer, and history state
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
