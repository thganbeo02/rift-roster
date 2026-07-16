# Worked balance example

This example runs the Summoner Split engine against the current test roster with **Van Hai excluded**. The remaining ten players have no recorded games yet, so win rate contributes nothing; effective strength comes from current rank plus the 70/30 peak-rank blend where a peak is known.

The engine evaluates 70 valid splits after mirror deduplication and the split-top-two constraint. The lowest-cost result is below.

## Recommended teams

### Team A

| Player | Assigned role | Preference | Effective score |
|---|---|---|---:|
| An | Jungle | Main | 545 |
| Quang Huu | ADC | Main | 400 |
| Khuong Duy | Top | Main | 200 |
| Viet Long | Mid | Main | 500 |
| Van Thu | Support | Main | 100 |
| **Team total** |  |  | **1745** |

### Team B

| Player | Assigned role | Preference | Effective score |
|---|---|---|---:|
| Hai Son | Top | Main | 500 |
| Xuan Quang | Jungle | Main | 200 |
| The Duy | ADC | Main | 545 |
| Trung Thanh | Mid | Main | 335 |
| Anh Son | Support | Main | 100 |
| **Team total** |  |  | **1680** |

An and The Duy are the two highest-rated players at 545 each, so the split-top-two rule keeps them on opposite teams. Every player receives a main role.

## Score calculation

The total is a cost, not a percentage. Lower is better.

```text
total = rankDifference
      + spreadWeight × spreadPenalty
      + roleWeight × rolePenalty
```

With the default weights, `spreadWeight = 1` and `roleWeight = 40`.

### 1. Rank difference: 65

```text
abs(1745 - 1680) = 65
```

Team A is estimated to be 65 effective-score points stronger. A normal rank-bucket step is 100 points, so the aggregate gap is smaller than one bucket spread across the whole team.

### 2. Spread penalty: 1.14

```text
abs(stdev(teamA) - stdev(teamB)) × 0.6
+ abs(max(teamA) - max(teamB)) × 0.5
= 1.14
```

Both teams have the same strongest-player score, 545, so the top-player-gap term is zero. Their internal skill distributions are also very similar, leaving only a small standard-deviation penalty.

### 3. Role penalty: 0

Role assignment costs are:

| Assignment | Raw cost | Cost at default role weight |
|---|---:|---:|
| Main | 0 | 0 |
| Listed secondary | 1 | 40 |
| Off-role | 3 | 120 |

All ten players receive main roles, so the raw role penalty is zero.

### Final score: 66.14

```text
65 + 1 × 1.14 + 40 × 0 = 66.14
```

The number means this is the lowest-cost candidate found for this roster under the current model. It does **not** mean the teams are “66.14% balanced.” Raw scores are most useful for comparing candidate splits produced from the same ten players.

## Fixture assumptions

- An: Emerald current rank with Diamond+/Master peak → `0.7 × 500 + 0.3 × 650 = 545`.
- The Duy: Emerald current rank with Diamond+ peak → `545`.
- Trung Thanh: provisional Silver current bucket with an old Diamond+ peak → `0.7 × 200 + 0.3 × 650 = 335`.
- Van Thu: provisional Iron/Bronze bucket because current and peak ranks are unknown after a long break.
- All players have `wins = 0` and `games = 0`; no fabricated form data affects the result.

The automated counterpart is `test/engine/integration.test.ts`.
