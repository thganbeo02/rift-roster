# Rift Roster — Product Requirements Document

> **Project:** Rift Roster (balancer engine: *Summoner Split*)
> **Author:** Zeros
> **Status:** v1 shipped · living doc
> **Audience:** Personal reference

---

## 1. Why this exists

The CNTT department has 12–15 people who play League of Legends, but almost never the same 10 at once. Some play daily, some a few times a week, some once a week. Two failure modes kill a casual group like this:

1. **Scheduling entropy** — without a fixed ritual, "we should play sometime" never converges on an actual lobby.
2. **Blowout attrition** — when teams are unbalanced, the same people get stomped week after week and quietly stop showing up. A group dies from lopsided games faster than from anything else.

Rift Roster attacks the second problem directly: given whoever showed up this week, produce two teams of five that are as fair as the roster allows — accounting for rank, role, current form, and the group's known outliers. The scheduling ritual is a process wrapper around it (fixed weekly slot, confirm-in), not software.

This is a personal tool first and a portfolio artifact second. It does **not** need to scale to other groups, support accounts, or run a backend. Those non-goals are load-bearing — they're why the design stays a single offline HTML file (see TDD).

---

## 2. Users

| User | Role | Needs |
|---|---|---|
| **Organizer** (me) | Runs the weekly lobby | Fast roster management, fair teams in <2 min, manual override when the numbers are wrong |
| **Players** (12–15) | Show up and play | Games that feel competitive; not getting stomped every week; not always being the one benched |

There is exactly one organizer and no auth. Player data is entered/maintained by the organizer, not self-served.

---

## 3. Problem statement

> Given a pool of 12–15 players of mixed skill and mixed availability, and a subset of exactly 10 who are playing this week, produce two balanced teams of 5 that (a) are close in aggregate strength, (b) avoid stacking all the skill on one side, (c) put players on roles they actually play, and (d) respect known duo/tilt relationships — in under two minutes of the organizer's time.

The hard part is not the split itself (126 combinations, trivially brute-forced). The hard part is **modeling "strength" well enough that equal-on-paper teams are equal in practice** — which means handling smurfs, rusty players, one-tricks, and role-dependent carry impact. That modeling is the actual product.

---

## 4. Scope

### In scope (v1 — shipped)
- Roster table: name, rank bucket, main/secondary role, wins/games, in/out flag.
- **Summoner Split** balancer: enumerates all 126 unique splits, scores each on rank difference + spread penalty + role fit, returns the best.
- Win-rate confidence weighting (ignored under 5 games, ramps to full at 20).
- Split-top-2 constraint (keep the two strongest on opposite teams).
- Balance meter with verdict + score gap; per-player role badges (amber when off-preferred-role).
- Balance notes surfacing outlier/carry warnings.
- Fun mode (random shuffle for ARAM).
- JSON import/export as the persistence layer.

### In scope (v1.1 — planned, see Roadmap)
- `peak` rank and manual `adjust` fields → stronger outlier modeling.
- `pairs` (together / apart) as hard constraints.

### Out of scope (deliberate non-goals)
- **Backend / accounts / multi-group** — kills the "open one file, works offline" property that makes this pleasant to use.
- **Riot API integration** — auto-pulling ranks would be cool but adds auth, rate limits, and a build step for marginal gain over a dropdown. Manual entry is <30s for the whole roster.
- **Live draft / in-client integration** — the tool proposes teams; humans lobby up manually.
- **Mobile-native app** — the HTML is responsive; that's enough.

---

## 5. Success metrics

Since this is personal, metrics are honest and observational, not analytics:

| Metric | Target | How I'll know |
|---|---|---|
| **Group survival** | Weekly lobby still running at week 8+ | It's still happening |
| **Competitiveness** | Most games not decided by 15 min | Vibe check + fewer 20-min surrenders |
| **Organizer effort** | <2 min from "who's in" to teams | Self-timed |
| **Override rate** | I manually swap on <1 in 4 lobbies | If I'm always overriding, the model is wrong |

The override rate is the real quality signal: a good model means I trust its output and rarely touch it.

---

## 6. Key product decisions & rationale

- **Rank as 6 coarse buckets, not divisions.** Divisions (I–IV) are false precision for a casual group. Six buckets (Iron/Bronze → Diamond+) with a non-linear jump at the top (Emerald→Diamond gap is genuinely bigger) is enough resolution to balance without demanding data nobody wants to enter.
- **Roles as strong preference, not hard lock.** Hard role-locking 10 casual players often makes teams *impossible* to form. Main = free, secondary = cheap, off-role = expensive. Tunable.
- **Win rate nudges, never overrides.** Rank is the primary signal; form is a ±half-bucket adjustment that only kicks in with enough games to be meaningful.
- **Spread penalty over pure sum-matching.** One Master + four Silvers can sum-match five Golds but is not balanced — the Master snowballs. Penalizing internal variance and top-player gap is the core insight that makes the balancer better than a naive point-sum.
- **JSON file as persistence.** No backend means no database; a portable file the organizer edits and re-imports is the whole state layer. Also makes the >10 case trivial: keep everyone in one file, flip `in` flags weekly.

---

## 7. Open questions

- Does form (win rate) actually improve balance, or is rank alone enough? Watch override rate with WR on vs off.
- Is bench rotation worth building, or does the group self-manage who sits out? Defer until it's actually annoying.
- Would drag-to-swap reduce override friction enough to be worth the UI work?
