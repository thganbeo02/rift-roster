# Rift Roster — Technical Design Doc

> **Component:** *Summoner Split* balancing engine + hosted host UI + snapshot backend
> **Author:** Zeros
> **Status:** describes the hosted, shareable architecture; flags v1.1 additions inline
> **Doc version:** 1.0.0
> **Audience:** Personal reference (future me)

---

## 1. Architecture at a glance

Rift Roster is a **hosted Next.js application on Vercel**. The shape is deliberately lopsided: almost everything is client-side, and the server does one small thing — store and serve published snapshots.

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT (organizer)              CLIENT (viewer)              │
│  ┌────────────────────────┐      ┌────────────────────────┐  │
│  │ UI: roster · controls  │      │ read-only teams view   │  │
│  │ Engine (Summoner Split)│      │ (no engine, no edit)   │  │
│  │ localStorage working   │      └───────────┬────────────┘  │
│  │ JSON import/export      │                  │ GET /v/<slug> │
│  └───────────┬────────────┘                  │               │
│              │ POST /api/publish (secret)     │               │
└──────────────┼────────────────────────────────┼──────────────┘
               ▼                                ▼
        ┌──────────────────────────────────────────────┐
        │  SERVER (Next.js route handlers on Vercel)    │
        │   /api/publish  → validate → write snapshot    │
        │   /v/[slug]     → read snapshot → SSR view      │
        ├──────────────────────────────────────────────┤
        │  STORAGE: KV store, snapshot JSON keyed by slug│
        └──────────────────────────────────────────────┘
```

**Three logical layers, split across client and server:**
- **Engine** (client, pure): scoring → split search → scoring. Framework-free and unit-tested.
- **UI** (client): organizer roster/controls/results, and a separate read-only viewer.
- **State/persistence:** organizer working state in `localStorage` + JSON I/O; *published* state in the server KV store.

**Why hosted, minimally:** making teams *viewable by the group* (PRD §1) needs shared state, which needs a server. The design contains the blast radius: the server never runs the engine, never holds accounts, and only ever stores/returns snapshot blobs. The interesting part of the system stays entirely client-side.

**Non-functional requirements:**
- Organizer app is responsive to mobile width; keyboard-focusable inputs.
- Balance computation completes in <100 ms client-side (126 splits × cheap scoring).
- Read-only view loads a snapshot with no engine execution — it's rendering stored results.
- Degrades safely on malformed import (clamps ranks, defaults roles/flags, never hard-crashes).
- Publish is gated by a secret; viewing requires nothing and grants nothing but read access.

---

## 2. Data model

```ts
type Player = {
  id: number;         // runtime only, not exported/published
  name: string;
  rank: 0..5;         // bucket index
  main: Role;
  sec: Role;
  wins: number;       // this split
  games: number;      // this split
  in: boolean;        // playing this week
  // v1.1:
  peak?: 0..5;        // peak rank bucket
  adjust?: number;    // manual bucket nudge, e.g. -1..+2
  lastSatOut?: number;// week index, for rotation (v2)
};

type Role = "Top" | "Jungle" | "Mid" | "ADC" | "Support";
```

**Rank buckets** (score is the currency the engine does math in):

| idx | bucket | score |
|-----|--------|-------|
| 0 | Iron/Bronze | 100 |
| 1 | Silver | 200 |
| 2 | Gold | 300 |
| 3 | Platinum | 400 |
| 4 | Emerald | 500 |
| 5 | Diamond+ | 650 |

The top jump (500 → 650, not → 600) encodes that the Emerald→Diamond skill gap is larger than the gaps below it. This matters for outlier detection: a Diamond+ genuinely should register as more of an outlier than linear spacing would suggest.

**Role impact weights** (for outlier judgement, not yet in the core score):
`Jungle 1.3 · Mid 1.2 · ADC 1.05 · Top 1.0 · Support 0.85` — a strong jungler is more oppressive than a strong support because jungle touches every lane.

---

## 3. Effective score — the heart of the model

Raw rank isn't skill. Effective score adjusts it by recent form, gated by confidence so early games (noise) don't swing anything.

```
effScore(p):
  base = RANKS[p.rank].score
  if useWR and p.games >= 5:
    wr   = p.wins / p.games            # 0..1
    conf = min(1, (p.games - 5) / 15)  # ramps 0 at 5 games → 1 at 20
    base += (wr - 0.5) * 2 * 60 * conf # ±60 max (~half a bucket)
  return base
```

Design choices:
- **5-game floor** — below this, win rate is pure variance.
- **Linear ramp 5→20** — form earns influence gradually as sample grows.
- **±60 cap (~half a bucket)** — form *nudges*, never overrides rank. A 70% Gold rates as high-Gold/low-Plat, not Diamond.
- **0.5 as neutral** — 50% WR = playing at rank = no adjustment.

**v1.1 extension — peak + adjust** (single composed function, order matters):
```
effScore(p):
  base = peak present ? 0.7*RANKS[p.rank].score + 0.3*RANKS[p.peak].score
                      : RANKS[p.rank].score          # peak blend
  if useWR and p.games >= 5:
    base += (wr - 0.5) * 2 * 60 * conf                # form, gated
  base += (p.adjust || 0) * 100                        # manual nudge, applied LAST
  return base
```
Peak captures smurf/rusty capability (a Gold who peaked Diamond); `adjust` is the organizer's final say for what the numbers can't see, applied after everything so it's a predictable flat shift.

---

## 4. Split search

The whole point: with 10 players, the solution space is tiny, so solve it **optimally** — no heuristics, no local search.

- Choosing 5 of 10 = C(10,5) = 252 combinations.
- Each split is counted twice (teamA/teamB mirror), so **126 unique splits**.
- Dedupe by only accepting combinations that contain player index 0.

```
best = null
for combo in kCombos([0..9], 5):
    if 0 not in combo: continue          # mirror dedupe (index 0 always in teamA)
    teamA = players[combo]
    teamB = players[not in combo]

    # split-top-2: skip when the two strongest share a team.
    # Because index 0 is always in teamA, "same team" means BOTH top players are
    # in combo OR BOTH are out of it — checking only "both in teamA" is a bug
    # (it misses the both-in-teamB case whenever neither top player is index 0).
    if splitTop and sameTeam(top1, top2, combo): continue

    if pairs violated (v1.1): continue    # hard constraint

    score = rankDiff + spreadPenalty + rolePenalty
    if best is null or score < best: best = this split
return best
```

The split-top-2 test is "both strongest on the same team," which — because the mirror-dedupe forces index 0 into `teamA` — means both top players in `combo` *or* both out of it: `sameTeam(a,b,combo) = (a∈combo) == (b∈combo)`. Checking only "both in `teamA`" would miss the both-in-`teamB` case whenever neither top player is index 0.

Total cost per balance: 126 splits × (2 role-fit solves + a few reductions). Role-fit is the most expensive inner op (§6) and it's still 120 permutations of trivial arithmetic. Whole thing is sub-100ms.

---

## 5. Scoring function — the three terms

```
score(teamA, teamB) = rankDiff
                    + spreadWeight * spreadPenalty
                    + roleWeight   * rolePenalty
```

Lower is better. **Weights:** `spreadWeight = 1` (outer multiplier), `roleWeight ∈ {0 off, 40 strong-preference [default], 120 near-strict}`. The two sub-term weights in §5b (0.6 / 0.5) carry the spread term's internal scaling, so `spreadWeight` is unity unless there's a reason to dial the whole term up or down.

The three terms and why each exists:

### 5a. rankDiff — aggregate fairness
`abs(sum(effScore teamA) - sum(effScore teamB))`. The obvious term: teams should total roughly equal strength. On its own it's *insufficient* — that's what §5b fixes.

### 5b. spreadPenalty — the outlier fix (the interesting term)
Sum-matching alone is fooled by stacking: `{Master + 4×Silver}` vs `{5×Gold}` can tie on sum but the Master snowballs and hard-carries. Two sub-terms fix this:

```
spreadPenalty = abs(stdev(teamA scores) - stdev(teamB scores)) * 0.6   # variety balance
              + abs(max(teamA scores)   - max(teamB scores))   * 0.5   # top-player gap
```

- **stdev difference** — both teams should have a *similar internal shape* (a mix of strong and weak), not one uniform team vs one bimodal team.
- **top-player gap** — directly punishes one side having a much stronger single carry.

This is the term that makes Summoner Split better than a naive point-sum balancer, and it's the concrete answer to "what if one team has a jungle who peaked Master."

### 5c. rolePenalty — playable comps
Sum of role-fit penalty for both teams (§6), scaled by `roleWeight`. Keeps five mid-mains from landing on one team with nobody who'll jungle. Note the magnitude interaction: at the default `roleWeight = 40`, a single off-role assignment (cost 3) contributes 120 — more than a full rank bucket (100). That's intentional "strong preference," but it's the knob to watch if role fit starts overriding rank balance (see §10).

---

## 6. Role fit as an assignment problem

For a team of 5, find the cheapest assignment of players → the 5 distinct roles.

- Cost: main role = 0, secondary = 1, off-role = 3.
- 5×5 assignment → Hungarian algorithm is the "correct" tool, but **120 permutations** is nothing, so brute-force all permutations and take the min. Simpler code, same answer.

```
roleFit(team):
  best = ∞
  for perm in permutations(ROLES):        # 120
    pen = Σ costOf(player_i, perm_i)
    best = min(best, pen)
  return best   # + the winning assignment, for display
```

Returned assignment drives the role badges in results (amber = off-preferred).

---

## 7. Modes & constraints

- **Split-top-2** — before scoring, skip any split where the two highest-effScore players are on the same team (§4 corrected logic). Cheap, prevents the worst blowouts.
- **Fun mode** — bypasses the entire engine; `players.sort(random)`, first 5 vs last 5. For ARAM nights where balance doesn't matter.
- **Pairs (v1.1)** — `together`/`apart` relationships become hard filters in the search loop (skip violating splits). Clean because we already enumerate exhaustively; constraints just prune the space.

---

## 8. Persistence & the snapshot backend

There are now **two** kinds of state, and keeping them separate is the whole design:

**A. Organizer working state (client-only).**
- Lives in `players[]` in memory, mirrored to `localStorage` so a refresh doesn't lose the in-progress roster.
- JSON import/export retained: export strips runtime `id`, pretty-prints; import parses, clamps `rank`/`peak` into range, validates roles against the enum (falls back to Top/Jungle), defaults `in` to true. Forgiving by design.
- **>10 players:** keep the whole pool in one file/localStorage, toggle `in` per week. Engine only considers `in:true` and refuses to run unless exactly 10 are in.
- Working schema is `{ players:[...], pairs:[...] }`. Importer accepts a bare array too (treat as `players` with empty `pairs`) for backward compatibility.

**B. Published snapshots (server KV).**
A snapshot is an immutable-ish record of a balanced result, created on Publish and read by the view link.

```ts
type Snapshot = {
  slug: string;          // short id, the shareable part of the URL
  createdAt: number;
  label?: string;        // e.g. "Week of Jul 14"
  teams: {
    a: { name: string; rank: number; role: Role; offRole: boolean }[];
    b: { ... };
  };
  meter: { verdict: string; gap: number };
  notes: string[];       // outlier/carry warnings shown read-only
  // NOTE: publish stores the *rendered result*, not raw wins/games,
  // to avoid leaking more per-player data than the view needs.
};
```

- **Store:** KV keyed by `slug` (e.g. Vercel KV / Upstash Redis). Snapshots are self-contained JSON; no relational schema needed.
- **Publish** (`POST /api/publish`): gated by a single organizer secret (env var, sent as a header/bearer). Validates the payload shape, writes `snapshot:<slug>`, returns `{ slug }`. Re-publishing with the same `slug` overwrites, so "the link" can be stable week to week (PRD §7 open question — current lean).
- **Read** (`GET /v/[slug]`): server reads the snapshot and server-renders the read-only view. No secret, no engine, no editing affordances. Missing slug → 404 page.
- **Slug generation:** short random (e.g. 8–10 url-safe chars). Unguessable enough for a private group; not a security boundary (see §11).

---

## 9. Hosting & deployment

- **Framework:** Next.js (App Router). Organizer app, viewer page, and API route handlers in one project.
- **Host:** Vercel. `git push` → build → deploy; preview deployments per branch/PR (matches the git workflow in AGENTS.md).
- **Env:** `PUBLISH_SECRET` (organizer write gate) and KV connection vars, set in Vercel project settings — never committed.
- **Rendering split:** organizer app is client-heavy (engine runs in the browser); `/v/[slug]` is server-rendered for clean link previews and no load-flash when shared in chat.

---

## 10. Known limitations / future work

- Role impact weights (§2) are defined but not yet folded into the core score — only used in warnings. Could weight outlier-ness by role in v2.
- `roleWeight = 40` makes one off-role assignment outweigh a full rank bucket; if role fit starts dominating rank balance in practice, this is the knob to revisit.
- `peak` blend at 30% may undershoot hard smurfs (a Gold who peaked Diamond+ blends to ~Platinum); watch whether `adjust` ends up doing the real work for smurfs.
- No drag-to-swap; overriding means editing inputs and re-running, then re-publishing.
- Bench rotation (`lastSatOut`) modeled in the schema but not implemented.
- Pairs are v1.1, not yet shipped.
- Snapshots never expire yet; if storage grows unwieldy, add TTL/cleanup (PRD §7).

---

## 11. Security & privacy

The bar is "sensible for a private friend group," not "public multi-tenant SaaS."

- **Write protection:** publishing is gated by `PUBLISH_SECRET`. Viewers cannot write. There are no accounts to compromise.
- **Slugs are obscurity, not authorization.** A random slug keeps casual snooping out but isn't a real access control — don't publish anything you'd be upset to see leak. Fine for team rosters.
- **Minimal data in snapshots.** Publish stores the rendered result (names, ranks, roles, verdict), not raw wins/games or any of the organizer's working notes. No emails, no accounts, no PII beyond in-game names the group already shares.
- **No third-party calls at runtime** beyond the app's own storage. No Riot API, no analytics by default.
- **Secrets live in env**, never in the repo (enforced by AGENTS.md §7 and `.gitignore`).

---

## Changelog

- **1.0.0** (2026-07-15) — Initial official version: hosted architecture with a minimal snapshot backend (§1, §8), hosting/deployment (§9), and security/privacy (§11). Includes the corrected split-top-2 logic (§4) and the pinned `spreadWeight` (§5).
