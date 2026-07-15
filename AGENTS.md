# AGENTS.md — Rift Roster

Operating rules for AI agents (and future-me) working in this repo. Read this before making changes. If a rule here conflicts with a request, surface the conflict instead of silently breaking the rule.

---

## 1. What this project is

Rift Roster is a team balancer for a casual League of Legends group — given 10 of a 12–15 player pool, the **Summoner Split** engine returns the fairest 5v5. The product design lives in [`docs/`](docs/) (PRD · TDD · Roadmap); read those for the _why_ behind the model. This file is about _how we work_, not what we build.

## 2. Non-negotiable constraints

These are load-bearing. Do not violate them without an explicit, recorded decision:

- **Hosted web app; the engine stays client-side.** The balancing engine runs in the browser and is framework-free. The server does exactly one thing: store and serve published read-only snapshots. It must never run the engine, hold user accounts, or edit on a user's behalf. (See PRD §6, TDD §1.) _This reverses the original "single offline file, no backend" constraint — see PRD §4 (Not a goal) and [CHANGELOG](docs/CHANGELOG.md) for why._
- **Read-only sharing, not multi-user.** One organizer edits; everyone else views via a link. No player accounts, no self-service editing. Adding auth/accounts is out of scope and would be a different project.
- **The engine stays pure.** All balancing logic lives in framework-free modules with zero DOM/React/server imports, so it stays testable in isolation and survives any UI rewrite. The UI _consumes_ the engine; the engine never reaches into the UI or the server.
- **Minimal dependencies and minimal backend.** Every runtime dependency and every byte of server logic is a liability. Do not add a dependency or expand the server's role without asking first. Dev-only tooling (test runner, bundler) is fine within reason.

## 3. Tech stack (target)

- **Host/UI:** Next.js (App Router) + React + TypeScript, deployed on Vercel (`git push` to deploy).
- **Engine:** pure TypeScript in `src/engine/`, framework-free.
- **Storage:** KV store (Vercel KV / Upstash) for published snapshots, keyed by slug. No relational schema.
- **Tests:** Vitest.
- **Secrets:** `PUBLISH_SECRET` (organizer write gate) + KV connection vars, set in the Vercel env — never committed.

> Transitional note: the repo is mid-migration from the original vanilla single-file scaffold to the Next.js stack above. Until the migration lands, some paths (`team-balancer.html`, `src/engine.mjs`, `build.mjs`) reflect the old layout. Keep the docs honest about which state we're in.

## 4. Making a change

1. **Engine changes** go in the pure engine modules and **must ship with tests**. No new engine behavior without a test that pins it.
2. **Run the tests** before considering a change done. They must be green.
3. **Run the build** for anything touching the shippable output, and confirm the single-file result still opens and works offline (constraint §2).
4. **Keep docs in sync.** If a change alters a decision recorded in `docs/` or this file, update that doc in the _same_ change. Stale docs that contradict the code are worse than no docs — the Roadmap's whole ethos is "write down decisions so I don't re-litigate them."
5. **One logical change per commit.** Don't bundle an unrelated cleanup into a feature commit.

## 5. Git workflow

- **Branches:** non-trivial work happens on a feature branch (`feature/…`, `fix/…`, `docs/…`), merged via PR. Tiny, obviously-safe fixes may go straight to `main`. **⟨your call⟩** — tighten to "always branch" if you prefer.
- **`main` is always working:** never commit code that fails tests or the build to `main`. Never force-push `main`.
- **Commit message template** — Conventional Commits, imperative mood:
  ```
  scope: summary

  Slightly more detailed summary. No more than 50 words.

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
  `scope` is the change type (`feat`, `fix`, `docs`, `chore`, `refactor`, …). The body explains _why_ when it isn't obvious and stays under 50 words — granular detail belongs in the changelog, not the message. Keep the co-author trailer on agent-assisted commits.
- **The agent never commits or pushes.** `git commit` and `git push` are **human-only**, always. The agent may stage files and draft the message, then hands over the exact command for the organizer to run. It must not execute `git commit` or `git push` itself under any circumstances — including during the wrap-up ritual.

## 6. Before you commit — checklist

- [ ] Tests pass (`vitest` / `node --test`)
- [ ] Typecheck passes (once TS is in place)
- [ ] Build succeeds and the single-file output still works offline
- [ ] Docs updated if a decision changed
- [ ] `docs/CHANGELOG.md` updated (or deferred to the wrap-up ritual, §8)
- [ ] No secrets, tokens, `.env`, `node_modules/`, or `dist/` staged

## 7. Never do

- Add a backend, account system, or runtime network call (kills the tool's premise).
- Commit secrets, tokens, or credentials — ever. If one is needed, it's provided at runtime, never in the repo.
- Commit generated artifacts (`dist/`, `node_modules/`) — they're gitignored; keep it that way.
- Force-push shared branches or rewrite `main`'s history.
- Introduce a UI framework dependency into the pure engine.
- Run `git commit` or `git push` — both are human-only. Stage and draft the message; hand over the command, never execute it.

## 8. Task modules & wrap-up (routing)

Detailed mechanics live in on-demand modules under `docs/agent/`; read the relevant one when you enter that mode.

- **Writing, refactoring, or fixing app code** → [`docs/agent/code-workflow.md`](docs/agent/code-workflow.md).
- **Editing spec docs or changelogs** (doc versioning, per-doc changelogs, project changelog format) → [`docs/agent/doc-workflow.md`](docs/agent/doc-workflow.md).
- **Closing out work** — when the organizer says **"wrap up"**, **"commit"**, or **"done"**, follow [`doc-workflow.md`](docs/agent/doc-workflow.md) §4 **exactly and in order**: inspect → update changelogs → sync docs → verify → stage → present the commit plan and the ready-to-run `git commit` command, then **stop**. The agent never runs `git commit` or `git push` (§5). Do not loosely summarize it.
- Only update `docs/CHANGELOG.md` during an explicit wrap-up/commit/done request or when directly asked — never preemptively during normal work.

---

_This is a living document. When a workflow rule proves wrong or annoying in practice, change the rule here rather than quietly ignoring it._
