# Rift Roster — Technical Design Doc

> **Component:** *Summoner Split* balancing engine + host UI
> **Author:** Zeros
> **Status:** describes v1; flags v1.1 additions inline
> **Audience:** Personal reference (future me)

---

## 1. Architecture at a glance

Single self-contained `team-balancer.html`. No build step, no dependencies, no network. Three logical layers in one file:

```
┌─────────────────────────────────────────────┐
│  UI layer   roster table · controls · results │
├─────────────────────────────────────────────┤
│  Engine     scoring → split search → scoring  │
│             (Summoner Split)                  │
├─────────────────────────────────────────────┤
│  State      in-memory players[] ⇄ JSON I/O    │
└─────────────────────────────────────────────┘
```

**Why single-file, no backend:** the entire value is "open it, get teams." A backend would add auth, hosting, and a build for zero benefit to a 15-person private tool. The JSON import/export *is* the persistence layer. This is a deliberate constraint, not a shortcut — see PRD non-goals.

**Non-functional requirements** (folded in here rather than a separate SRS):
- Runs fully offline from a local file.
- Balance computation completes in <100 ms (it does — 126 splits × cheap scoring).
- Degrades safely on malformed import (clamps ranks, defaults roles/flags, never hard-crashes).
- Responsive to mobile width; keyboard-focusable inputs.

---

## 2. Data model

```ts
type Player = {
  id: number;        // runtime only, not exported
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

**v1.1 extension — peak + adjust:**
```
base = 0.7 * RANKS[p.rank].score + 0.3 * RANKS[p.peak].score   # peak blend
base += (p.adjust || 0) * 100                                   # manual nudge, applied last
```
Peak captures smurf/rusty capability (a Gold who peaked Diamond); `adjust` is the organizer's final say for things the numbers can't see. `adjust` is applied *after* everything so it's a predictable flat shift.

---

## 4. Split search

The whole point: with 10 players, the solution space is tiny, so solve it **optimally** — no heuristics, no local search.

- Choosing 5 of 10 = C(10,5) = 252 combinations.
- Each split is counted twice (teamA/teamB mirror), so **126 unique splits**.
- Dedupe by only accepting combinations that contain player index 0.

```
best = null
for combo in kCombos([0..9], 5):
    if 0 not in combo: continue          # mirror dedupe
    teamA = players[combo]
    teamB = players[not in combo]

    if splitTop and both top-2 players in teamA: continue   # constraint
    if pairs violated (v1.1): continue                       # hard constraint

    score = rankDiff + spreadPenalty + rolePenalty
    if best is null or score < best: best = this split
return best
```

Total cost per balance: 126 splits × (2 role-fit solves + a few reductions). Role-fit is the most expensive inner op (§6) and it's still 120 permutations of trivial arithmetic. Whole thing is sub-100ms.

---

## 5. Scoring function — the three terms

```
score(teamA, teamB) = rankDiff
                    + spreadWeight * spreadPenalty
                    + roleWeight   * rolePenalty
```

Lower is better. The three terms and why each exists:

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
Sum of role-fit penalty for both teams (§6), scaled by `roleWeight` (0 = off, 40 = strong preference [default], 120 = near-strict). Keeps five mid-mains from landing on one team with nobody who'll jungle.

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

- **Split-top-2** — before scoring, skip any split with both highest-effScore players on the same team. Cheap, prevents the worst blowouts.
- **Fun mode** — bypasses the entire engine; `players.sort(random)`, first 5 vs last 5. For ARAM nights where balance doesn't matter.
- **Pairs (v1.1)** — `together`/`apart` relationships become hard filters in the search loop (skip violating splits). Clean because we already enumerate exhaustively; constraints just prune the space.

---

## 8. Persistence

No storage API (also: browser storage is unavailable in the target host anyway). State lives in `players[]`; JSON import/export moves it in and out.

- **Export** strips runtime `id`, pretty-prints, drops it in the textarea to copy into a file.
- **Import** parses, clamps `rank`/`peak` into range, validates roles against the enum (falls back to Top/Jungle), defaults `in` to true. Forgiving by design — a hand-edited file with a small typo still loads.
- **>10 players:** keep the whole pool in one file, toggle `in` per week. Engine only considers `in:true` and refuses to run unless exactly 10 are in.
- **v1.1 schema** shifts from bare array to `{ players:[...], pairs:[...] }`. Importer will accept both (if input is an array, treat as `players` with empty `pairs`) for backward compatibility.

---

## 9. Validation strategy (in lieu of a formal test plan)

Sanity checks I can eyeball, not a QA suite:

- **Sample lobby splits well** — the built-in 10-player sample should produce a small score gap (well-balanced verdict).
- **Split-top invariant** — with split-top on, the two highest-effScore players are never on the same team across many re-runs.
- **WR gating** — a player with <5 games contributes exactly their rank score (WR ignored); at 20 games WR is at full ±60 influence.
- **Spread sanity** — construct `{Diamond+ + 4×low}` vs `{5×mid}`; confirm the engine prefers splitting the Diamond+ away from a stacked side rather than sum-matching into a blowout.
- **Import robustness** — feed a file with an out-of-range rank and a misspelled role; confirm it loads clamped/defaulted instead of crashing.

---

## 10. Known limitations / future work

- Role impact weights (§2) are defined but not yet folded into the core score — only used in warnings. Could weight outlier-ness by role in v2.
- No drag-to-swap; overriding means editing inputs and re-running.
- Bench rotation (`lastSatOut`) modeled in the schema but not implemented.
- Pairs are v1.1, not yet shipped.
