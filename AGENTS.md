# AGENTS.md — Rift Roster

Operating rules for AI agents (and future-me) working in this repo. Read this before making changes. If a rule here conflicts with a request, surface the conflict instead of silently breaking the rule.

---

## 1. What this project is

Rift Roster is a team balancer for a casual League of Legends group — given 10 of a 12–15 player pool, the **Summoner Split** engine returns the fairest 5v5. The product design lives in [`docs/`](docs/) (PRD · TDD · Roadmap); read those for the _why_ behind the model. This file is about _how we work_, not what we build.

## 2. Non-negotiable constraints

These are load-bearing. Do not violate them without an explicit, recorded decision:

- **Hosted web app; the engine stays client-side.** The balancing engine runs in the browser and is framework-free. The server stores planned-match records, serves read-only reports, and—only on an explicit organizer action—proxies post-game result lookups to Riot with a server-held API key. It must never run the engine, hold user accounts, or rebalance/edit a plan on a user's behalf. (See PRD §6, TDD §1.)
- **Read-only sharing, not multi-user.** One organizer edits; everyone else views via a link. No player accounts, no self-service editing. Adding auth/accounts is out of scope and would be a different project.
- **The engine stays pure.** All balancing logic lives in framework-free modules with zero DOM/React/server imports, so it stays testable in isolation and survives any UI rewrite. The UI _consumes_ the engine; the engine never reaches into the UI or the server.
- **Minimal dependencies and bounded backend.** Every runtime dependency and every byte of server logic is a liability. Server behavior is limited to planned-match persistence, read-only reports, organizer-gated history operations, and server-side Riot result synchronization. Do not expand that role without asking first. Dev-only tooling (test runner, bundler) is fine within reason.

## 3. Tech stack (target)

- **Host/UI:** Next.js (App Router) + React + TypeScript, deployed on Vercel (`git push` to deploy).
- **Engine:** pure TypeScript in `src/engine/`, framework-free.
- **Storage:** KV store (Vercel KV / Upstash) for planned-match records, public report snapshots, and the organizer's match index. No relational schema.
- **Tests:** Vitest.
- **Secrets:** `PUBLISH_SECRET` (organizer write/sync gate), `RIOT_API_KEY` (post-game result lookup), and KV connection vars, set in the Vercel env — never committed or exposed to the browser.

## 4. Making a change

1. **Engine changes** go in the pure engine modules and **must ship with tests**. No new engine behavior without a test that pins it.
2. **Run the tests** before considering a change done. They must be green.
3. **Verify at runtime** — for anything touching runtime behavior, run the build and exercise the change in the running app (dev server or a deployed preview), not just the tests. Confirm the engine stayed client-side and server behavior stayed within constraint §2.
4. **Keep docs in sync.** If a change alters a decision recorded in `docs/` or this file, update that doc in the _same_ change. Stale docs that contradict the code are worse than no docs — the Roadmap's whole ethos is "write down decisions so I don't re-litigate them."
5. **One logical change per commit.** Don't bundle an unrelated cleanup into a feature commit.

## 5. Git workflow

- **Branches:** non-trivial work happens on a feature branch (`feature/…`, `fix/…`, `docs/…`), merged via PR. Tiny, obviously-safe fixes may go straight to `main`. **⟨your call⟩** — tighten to "always branch" if you prefer.
- **`main` is always working:** never commit code that fails tests or the build to `main`. Never force-push `main`.
- **Commit message template** — Conventional Commits, imperative mood:
  ```
  scope: summary

  Slightly more detailed summary. No more than 50 words.
  ```
  `scope` is the change type (`feat`, `fix`, `docs`, `chore`, `refactor`, …). The body explains _why_ when it isn't obvious and stays under 50 words — granular detail belongs in the changelog, not the message. Add attribution only when the organizer explicitly wants it; agent assistance does not require a co-author trailer.
- **The agent never commits or pushes.** `git commit` and `git push` are **human-only**, always. The agent may stage files and draft the message, then hands over the exact command for the organizer to run. It must not execute `git commit` or `git push` itself under any circumstances — including during the wrap-up ritual.

## 6. Before you commit — checklist

- [ ] Tests pass (`npm run test`)
- [ ] Typecheck passes (once TS is in place)
- [ ] Build succeeds and the change works in the running app
- [ ] Docs updated if a decision changed
- [ ] `docs/CHANGELOG.md` updated (or deferred to the wrap-up ritual, §8)
- [ ] No secrets, tokens, `.env`, `node_modules/`, or `dist/` staged

## 7. Never do

- Add player accounts, move balancing onto the server, or add a runtime network call outside the app's own storage and the explicit server-side Riot result-sync flow.
- Expose `RIOT_API_KEY` to client code, logs, public reports, or stored browser state.
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
