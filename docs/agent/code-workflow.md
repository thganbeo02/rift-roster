# Code workflow

Task module for writing, refactoring, or fixing app code. AGENTS.md routes here; read it when you enter this mode. AGENTS.md's constraints (§2) always apply — especially "engine stays pure" and "minimal dependencies."

---

## 1. Where code goes

- `src/engine/` — pure Summoner Split logic. No React, DOM, network, or server imports. Ever.
- `src/components/` — React UI. Presentational where possible; lift state to hooks/stores.
- `src/app/` — Next.js routes, including `/api/*` handlers and the `/v/[slug]` view.
- `src/state/` — hooks and stores (roster, localStorage sync).
- `src/lib/` — small framework-free helpers (formatting, slug, snapshot serialization).
- `test/` — Vitest specs.

Keep the dependency arrow one-way: `app → components → state → engine/lib`. The engine never imports upward.

## 2. General conventions

- **TypeScript, reasonably strict.** Type the boundaries (function signatures, props, API payloads); avoid `any` without a comment saying why.
- **Small, single-purpose modules.** Name by what it does. Split when a file starts doing two jobs.
- **Pure core, effects at the edges.** Keep I/O, storage, randomness, and `Date.now()` in the UI/api/storage layers — not in scoring logic.
- **Match the surrounding style.** Follow the idiom, naming, and comment density of nearby code. Don't reformat unrelated lines in a change.
- **Comments explain _why_, not _what_.** The what is the code. Don't leave commented-out blocks or dead code behind.

## 3. Engine rules (the product's core)

- **Deterministic and pure.** Same inputs → same output. No I/O, no clock, no global state. The only randomness is Fun mode, and its RNG is passed in so it can be seeded in tests.
- **Framework-free.** No imports from React, Next, or the DOM. This is what keeps it unit-testable and portable.
- **Every behavior has a test.** New engine behavior ships with a Vitest test that pins it; bug fixes ship with a regression test.

## 4. Tests

- **Vitest.** Test observable behavior, not internal shape, so refactors don't break tests needlessly.
- **Green before done.** Run the suite before calling any change complete (AGENTS §6). Don't hand off red tests without flagging.
- **The engine is where coverage matters most** — the UI can be lighter.

### Manual command reference

Run commands from the repository root. Until the M2 engine port moves the engine tests to Vitest, keep the legacy `node --test` suite green alongside `npm run test`.

```sh
node --test          # legacy engine tests (keep green until M2 completes)
npm run test         # Vitest suite
npm run typecheck    # TypeScript check without emitting files
npm run build        # production Next.js build
npm run dev          # local app; stop with Ctrl-C
```

After `npm run dev`, open the local URL printed by Next.js and exercise the affected flow.

## 5. Dependencies

- **Don't add a runtime dependency without asking** (AGENTS §2). Reach for the platform and stdlib first; a small helper usually beats a package.
- Dev-only deps (test runner, types, linters) are fine within reason.

## 6. Before you call it done

- Typecheck and tests pass.
- No secrets or machine-specific config in code — those live in env (AGENTS §7).
- The server stayed dumb: no engine on the server, no accounts, snapshot storage only (AGENTS §2).
