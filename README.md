# Rift Roster

A team balancer for casual League of Legends lobbies. Given 10 of a 12–15 player
pool, the **Summoner Split** engine enumerates all 126 unique 5v5 splits and
returns the fairest one — accounting for rank, current form, role fit, and known
duo/tilt pairs.

See [`docs/`](docs/) for the PRD, TDD, and Roadmap.

## Stack

Deliberately minimal, because "open one file, works offline" is the whole point.

- **Product:** a single self-contained `team-balancer.html` — vanilla HTML/CSS/JS,
  no framework, no backend, no runtime dependencies, no network.
- **Engine source of truth:** [`src/engine.mjs`](src/engine.mjs) — pure, DOM-free
  functions, so the model can be unit-tested in isolation.
- **Tests:** Node's built-in runner (`node --test`) — zero dependencies, no install.
- **Build:** [`build.mjs`](build.mjs) — a dev-only ~20-line inliner that folds
  `src/engine.mjs` into `team-balancer.html`. Never runs in the browser. Drop it
  if you want literally zero tooling and hand-inline instead.

Requires Node 18+ (for `node --test`). Nothing to `npm install`.

## Layout

```
team-balancer.html   the shippable single file (engine gets inlined here)
src/engine.mjs       Summoner Split engine — tested source of truth
test/engine.test.mjs unit tests (node --test)
build.mjs            inlines the engine into the HTML
sample-roster.json   a 10-in sample lobby ({ players, pairs } schema)
docs/                PRD · TDD · Roadmap
```

## Develop

```sh
node --test        # run the engine tests
node build.mjs      # inline engine.mjs -> team-balancer.html
open team-balancer.html
```

## Status

Scaffold. Engine constants, `effScore`, and `kCombos` are implemented and tested;
`roleFit` / `spreadPenalty` / `scoreSplit` / `balance` and the UI layer are next.

> Note: the split-top-2 constraint must skip a split when the two strongest
> players share a team (both in the combo **or** both out) — TDD §4's pseudocode
> only checks one side. Tracked as finding #1 from the docs review.
