# Rift Roster — Technical Design Doc

> **Component:** *Summoner Split* engine + hosted match journal + Riot result adapter
> **Author:** Zeros
> **Status:** describes save/share, match history, and planned Riot result sync
> **Doc version:** 2.0.0
> **Audience:** Personal reference (future me)

---

## 1. Architecture at a glance

Rift Roster is a **hosted Next.js application on Vercel**. Balancing and working roster state remain client-side. The server has a bounded journal role: persist immutable plans, serve read-only reports, maintain organizer history, and fetch post-game evidence from Riot only when the organizer explicitly requests it.

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT (organizer)              CLIENT (viewer)              │
│  ┌────────────────────────┐      ┌────────────────────────┐  │
│  │ UI: roster · history   │      │ read-only match report │  │
│  │ Engine (Summoner Split)│      │ (no engine, no edit)   │  │
│  │ localStorage working   │      └───────────┬────────────┘  │
│  │ JSON import/export      │                  │ GET /v/<slug> │
│  └───────────┬────────────┘                  │               │
│              │ save/sync APIs (secret)        │               │
└──────────────┼────────────────────────────────┼──────────────┘
               ▼                                ▼
        ┌──────────────────────────────────────────────┐
        │  SERVER (Next.js route handlers on Vercel)    │
        │   match APIs    → validate → write/read records │
        │   Riot adapter  → Account-V1 / Match-V5         │
        │   /v/[slug]     → read report → SSR view        │
        ├──────────────────────────────────────────────┤
        │ STORAGE: KV match records + organizer index     │
        └──────────────────────────────────────────────┘
```

**Three logical layers, split across client and server:**
- **Engine** (client, pure): scoring → split search → scoring. Framework-free and unit-tested.
- **UI** (client): organizer roster/controls/results/history, plus a separate read-only report viewer.
- **State/persistence:** organizer working state in `localStorage` + JSON I/O; saved matches and history index in server KV.
- **Integrations** (server only): Riot identity and Match-V5 lookups behind the organizer write gate; normalized results cross back into storage.

**Why the boundary holds:** durable reports and a protected Riot key require a server, but neither requires server-side balancing or player accounts. The plan arrives already rendered from the browser. The Riot adapter only describes a finished game and cannot rerun, tune, or mutate the plan.

**Non-functional requirements:**
- Organizer app is responsive to mobile width; keyboard-focusable inputs.
- Balance computation completes in <100 ms client-side (126 splits × cheap scoring).
- Read-only view loads a report with no engine execution—it renders stored plan/result data.
- Degrades safely on malformed import (clamps ranks, defaults roles/flags, never hard-crashes).
- Saves, history mutations, and Riot synchronization are gated by one organizer secret; viewing requires nothing and grants only read access.

---

## 2. Data model

```ts
type RankIndex = 0 | 1 | 2 | 3 | 4 | 5;
type Role = "Top" | "Jungle" | "Mid" | "ADC" | "Support";

type Player = {
  id: string;         // stable across UI state and JSON import/export
  name: string;
  rank: RankIndex;    // bucket index
  mainRole: Role;
  secondaryRoles: Role[]; // one or more; all non-main roles means "fill"
  wins: number;       // this split
  games: number;      // this split
  // v1.1:
  peak?: RankIndex;   // peak rank bucket
  adjust?: number;    // manual bucket nudge, e.g. -1..+2
};

type RosterPlayer = Player & {
  in: boolean;                          // playing this week
  source: "manual" | "generated";      // admin-test provenance
  lastSatOut?: number;                  // week index, for rotation (v2)
};

type RiotIdentity = {
  gameName: string;
  tagLine: string;
  platform: string;     // e.g. the player's League platform shard
  puuid?: string;       // resolved server-side; organizer data, never public
};
```

The engine consumes `Player`; organizer-only availability extends it as `RosterPlayer` in the client state layer. `RiotIdentity` is optional organizer metadata introduced for M6 and is never an engine input. String IDs survive import/export without relying on array position. `secondaryRoles` is an array because real rosters include fill players; any listed secondary costs 1 in role assignment, while an unlisted role costs 3.

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

### 4a. Ranked candidates and fresh repeat balancing

`rankBalanceCandidates()` returns every valid split ordered by total cost; `balance()` remains the compatible deterministic API and returns the first (optimal) candidate. Variety is a client-state policy, not hidden randomness inside the engine.

For Balance/Rebalance, the organizer app builds a near-optimal pool whose cost is at most 100 above optimal and whose off-role count does not exceed the optimum. It randomly selects an unused candidate, then stores a canonical split signature in `localStorage`, keyed by the sorted IDs of the exact 10-player cohort. Team color and player order do not affect the signature. The last eight signatures are avoided; when the eligible pool is exhausted, history cycles.

---

## 5. Scoring function — the three terms

```
score(teamA, teamB) = rankDiff
                    + spreadWeight * spreadPenalty
                    + roleWeight   * rolePenalty
```

Lower is better. **Weights:** `spreadWeight = 1` (outer multiplier), `roleWeight ∈ {0 off, 40 strong-preference [default], 120 near-strict}`. The two sub-term weights in §5b (0.6 / 0.5) carry the spread term's internal scaling, so `spreadWeight` is unity unless there's a reason to dial the whole term up or down.

See the [worked real-roster balance example](examples/real-roster-balance.md) for a complete split and a step-by-step interpretation of each score term.

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

### 5d. Human-facing balance meter

The results UI derives a 0–100 balance score and model-estimate win shares from the effective-score delta using one tunable logistic scale. This is a presentation helper in `src/lib/`, not part of candidate scoring, and its language remains explicitly a model estimate because no outcome dataset exists for calibration. Rank gap, spread, and total cost stay visible separately.

---

## 6. Role fit as an assignment problem

For a team of 5, find the cheapest assignment of players → the 5 distinct roles.

- Cost: main role = 0, any listed secondary role = 1, off-role = 3.
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
- **Fun mode** — bypasses the entire engine; a pure Fisher–Yates helper copies and shuffles the 10 selected players, then returns the first 5 vs. last 5. Its RNG is injected for tests, and the UI deliberately shows no balance metrics.
- **Pairs (v1.1)** — `together`/`apart` relationships become hard filters in the search loop (skip violating splits). Clean because we already enumerate exhaustively; constraints just prune the space.

---

## 8. Persistence & match records

There are **three** kinds of state, and keeping them separate is the whole design:

**A. Organizer working state (client-only).**
- Lives in `players[]` in memory, mirrored to `localStorage` so a refresh doesn't lose the in-progress roster.
- JSON import/export retained: export keeps stable IDs and pretty-prints `{players:[...]}`; import also accepts a legacy bare array, clamps `rank`/`peak`, validates and deduplicates roles, repairs missing/duplicate IDs, and defaults flags safely. Invalid files never replace the current roster.
- **>10 players:** keep the whole pool in one file/localStorage, toggle `in` per week. Engine only considers `in:true` and refuses to run unless exactly 10 are in.
- Working schema is `{players:[...]}`. The v1.1 pairs feature will extend it to `{players, pairs}` while keeping bare-array imports backward compatible.

**B. Saved match records (server KV).**
Save Team creates an immutable plan and an initially-empty result slot. Attaching a result changes status and result only; the original plan is never regenerated or overwritten.

```ts
type PlannedMatch = {
  id: string;            // internal stable match id
  slug: string;          // unique public report id
  savedAt: number;
  label?: string;        // e.g. "Week of Jul 14"
  teams: {
    a: { name: string; rank: number; role: Role; offRole: boolean }[];
    b: { ... };
  };
  meter: { verdict: string; gap: number };
  notes: string[];       // outlier/carry warnings shown read-only
};

type MatchResult = {
  source: "riot";
  riotMatchId: string;
  startedAt: number;
  durationSeconds: number;
  winner: "azure" | "crimson";
  syncedAt: number;
};

type MatchReport = {
  plan: PlannedMatch;
  result?: MatchResult;
};
```

- **Store:** `match:<id>` holds the organizer record; `report:<slug>` resolves the public report; `matches:organizer` is a newest-first bounded index. KV operations that update a record and index must be designed to recover from partial failure.
- **Save:** an organizer-gated route validates the rendered plan, assigns server timestamps/IDs, writes the record and index, and returns `{ id, slug }`. Every saved match receives a distinct slug; saving is not a weekly overwrite.
- **Read:** `/v/[slug]` server-renders the public report. No secret, engine, PUUID, or editing affordance. Missing slug returns 404.
- **History:** organizer-gated reads return compact metadata first; opening a report loads the full record. Avoid transferring all participant data for the list screen.
- **Slug generation:** nine URL-safe random characters, minted once per saved match. Unguessable enough for a private group but not authorization (see §12).

**C. Riot identity mapping (organizer-only).**
- Roster players may carry Riot ID, platform, and resolved PUUID outside the pure engine contract.
- Public reports show the familiar in-game display name only. PUUID, API response bodies, and lookup diagnostics remain private.
- Identity resolution may be cached, but a stale mapping must be refreshable when a Riot ID changes.

---

## 9. Riot result synchronization (M6)

Riot synchronization is an explicit post-game organizer workflow, never background polling and never a balancing input.

1. Organizer selects **Update Result** on an awaiting-result report.
2. Server resolves missing Riot IDs through Account-V1 and queries recent Match-V5 IDs for one or more linked PUUIDs after `plan.savedAt`.
3. Server fetches a small candidate set and normalizes only fields needed for matching/reporting.
4. Candidate ranking considers participant overlap first, then start time, game type/map, and whether participant sides match the saved plan.
5. UI displays candidates and mismatches. Organizer confirms one candidate or enters a match ID manually.
6. Server validates the confirmation, maps the winning Riot side to Azure/Crimson using participant PUUID sets, and stores `MatchResult` without changing `PlannedMatch`.

The Riot adapter is an interface with fixture-driven tests. Unit tests never call Riot. It must handle timeouts, 401/403 key failures, 404/no-match, and 429 rate limits as explicit application errors. A development key is for local prototypes only; deployment uses the key type approved for the product's actual audience. Re-check the [Riot Developer Portal guide](https://developer.riotgames.com/docs/portal), [League policy](https://developer.riotgames.com/docs/lol), and [general security policy](https://developer.riotgames.com/policies/general) before implementation because API rules can change.

## 10. Hosting & deployment

- **Framework:** Next.js (App Router). Organizer app, viewer page, and API route handlers in one project.
- **Host:** Vercel. `git push` → build → deploy; preview deployments per branch/PR (matches the git workflow in AGENTS.md).
- **Env:** `PUBLISH_SECRET`, `RIOT_API_KEY`, and KV connection vars live in Vercel project settings—never committed or exposed through `NEXT_PUBLIC_*` variables.
- **Rendering split:** organizer app is client-heavy; `/v/[slug]` is server-rendered for clean link previews. Riot calls occur only in protected route handlers after organizer action, never during public rendering.

---

## 11. Known limitations / future work

- Role impact weights (§2) are defined but not yet folded into the core score — only used in warnings. Could weight outlier-ness by role in v2.
- `roleWeight = 40` makes one off-role assignment outweigh a full rank bucket; if role fit starts dominating rank balance in practice, this is the knob to revisit.
- `peak` blend at 30% may undershoot hard smurfs (a Gold who peaked Diamond+ blends to ~Platinum); watch whether `adjust` ends up doing the real work for smurfs.
- No drag-to-swap; overriding means editing inputs and re-running, then saving a new plan.
- Bench rotation (`lastSatOut`) modeled in the schema but not implemented.
- Pairs are v1.1, not yet shipped.
- Reports never expire initially; add archive/retention only when storage, clutter, or privacy becomes real friction.
- Match-V5 visibility for the group's custom-game setup and region must be proven with real games before automatic candidate ranking is considered reliable.
- Players may use alternate accounts; manual match-ID confirmation remains a required fallback.

---

## 12. Security & privacy

The bar is "sensible for a private friend group," not "public multi-tenant SaaS."

- **Write protection:** saving, organizer history, identity resolution, and result sync are gated by `PUBLISH_SECRET`. Viewers cannot write. There are no player accounts.
- **Slugs are obscurity, not authorization.** A random slug keeps casual snooping out but isn't a real access control — don't publish anything you'd be upset to see leak. Fine for team rosters.
- **Minimal public reports.** Plans expose rendered names, ranks, roles, verdict, and confirmed outcome—not raw wins/games, PUUIDs, lookup diagnostics, or organizer secrets.
- **Server-only Riot key.** `RIOT_API_KEY` is sent only from server route handlers to Riot over HTTPS. It never appears in browser code, localStorage, logs, public errors, or stored report JSON.
- **No silent automation.** Riot lookup happens only on organizer request, and attaching a candidate requires confirmation. No cron job or public endpoint can consume the key.
- **Secrets live in env**, never in the repo (enforced by AGENTS.md §7 and `.gitignore`). Riot registration, key type, and published legal/privacy disclosures must match the deployed audience before M6 ships.

---

## Changelog

- **2.0.0** (2026-07-18) — Replaced the one-snapshot backend with immutable planned-match records, recorded the delivered rendered-plan validation boundary, and added a bounded server-side Riot result adapter with confirmation and privacy controls.
- **1.2.0** (2026-07-17) — Documented ranked fresh-split selection, balance presentation, tested ARAM shuffle, organizer provenance, and stable-ID JSON transfer delivered with M3.
- **1.1.0** (2026-07-16) — Aligned the player schema with the TypeScript engine, documented multiple secondary roles, and linked a worked scoring example.
- **1.0.0** (2026-07-15) — Initial official version: hosted architecture with a minimal snapshot backend (§1, §8), hosting/deployment (§9), and security/privacy (§11). Includes the corrected split-top-2 logic (§4) and the pinned `spreadWeight` (§5).
