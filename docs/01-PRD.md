# Rift Roster — Product Requirements Document

> **Project:** Rift Roster (balancer engine: *Summoner Split*)
> **Author:** Zeros
> **Status:** hosted + shareable · living doc
> **Doc version:** 1.2.0
> **Audience:** Personal reference

---

## 1. Why this exists

The CNTT department has 12–15 people who play League of Legends, but almost never the same 10 at once. Some play daily, some a few times a week, some once a week. Two failure modes kill a casual group like this:

1. **Scheduling entropy** — without a fixed ritual, "we should play sometime" never converges on an actual lobby.
2. **Blowout attrition** — when teams are unbalanced, the same people get stomped week after week and quietly stop showing up. A group dies from lopsided games faster than from anything else.

Rift Roster attacks the second problem directly: given whoever showed up this week, produce two teams of five that are as fair as the roster allows — accounting for rank, role, current form, and the group's known outliers. The scheduling ritual is a process wrapper around it (fixed weekly slot, confirm-in), not software.

Beyond producing fair teams, Rift Roster makes them **visible to the whole group**: the organizer publishes each week's split as a read-only link anyone can open. This matters because balance only defuses attrition if the group *believes* it's fair — "why am I always on the weaker team" festers as an uncheckable suspicion when only the organizer sees the numbers. A shared link turns fairness from a claim into something anyone can look at before lobby-up.

This is a personal tool first and a portfolio artifact second. The hosting footprint is kept deliberately minimal: the server only stores and serves published snapshots, and the balancing engine runs entirely client-side (see §6, TDD §1).

---

## 2. Users

| User | Role | Needs |
|---|---|---|
| **Organizer** (me) | Runs the weekly lobby, sole editor | Fast roster management, fair teams in <2 min, manual override when the numbers are wrong, one-click publish to a shareable link |
| **Viewers** (players / anyone with the link) | Read-only | See this week's roster and the generated teams; trust that the split is fair; no login, no setup |

There is still exactly **one organizer** and **no player accounts**. Player data is entered and maintained by the organizer, not self-served. Viewers authenticate with nothing — possession of the link is the only "permission," and the link exposes no editing power.

---

## 3. Problem statement

> Given a pool of 12–15 players of mixed skill and mixed availability, and a subset of exactly 10 who are playing this week, produce two balanced teams of 5 that (a) are close in aggregate strength, (b) avoid stacking all the skill on one side, (c) put players on roles they actually play, and (d) respect known duo/tilt relationships — in under two minutes of the organizer's time — and make the result **viewable by the whole group through a link**, with no install and no account.

The hard part is still not the split itself (126 combinations, trivially brute-forced). It's **modeling "strength" well enough that equal-on-paper teams are equal in practice** — smurfs, rusty players, one-tricks, role-dependent carry impact. That modeling is the actual product. Hosting and sharing are a thin, deliberately-minimal wrapper around that unchanged core.

---

## 4. Scope

### Shipped (v1 — engine)
- Roster table: name, rank bucket, main role, secondary roles (including fill), wins/games, in/out flag.
- **Summoner Split** balancer: enumerates all 126 unique splits, scores each on rank difference + spread penalty + role fit, returns the best.
- Win-rate confidence weighting (ignored under 5 games, ramps to full at 20).
- Split-top-2 constraint (keep the two strongest on opposite teams).
- Balance meter with verdict + score gap; per-player role badges (amber when off-preferred-role).
- Balance notes surfacing outlier/carry warnings.
- Fun mode (random shuffle for ARAM).
- JSON import/export as a persistence/backup layer.

### In scope (hosted + shareable read-only)
- **Hosting:** the app runs at a public URL (no install, no offline-file handoff).
- **Publish:** organizer publishes a snapshot (roster + generated teams + verdict) and gets a stable shareable link `/v/<slug>`.
- **Read-only view:** anyone with the link sees the published roster and teams, rendered read-only. No editing, no engine re-run, no login.
- **Organizer working persistence:** localStorage for the in-progress roster, plus JSON import/export retained for backup and the >10 file-swap workflow.
- **Fresh repeat balancing:** remember recent splits for the same 10-player cohort and choose a different near-optimal arrangement on later balances/rebalances.
- **Minimal write protection:** a single organizer publish secret gates writes; no user/account system.

### In scope (v1.1 — still planned, see Roadmap)
- `peak` rank and manual `adjust` fields → stronger outlier modeling.
- `pairs` (together / apart) as hard constraints.

### Out of scope (deliberate non-goals)
- **Player accounts / self-service editing / multi-organizer** — there is one organizer; players are viewers, not editors. Adding accounts would be a genuinely different project.
- **Riot API integration** — auto-pulling ranks adds auth, rate limits, and CORS pain for marginal gain over a dropdown. Manual entry is <30s for the whole roster.
- **Live draft / in-client integration** — the tool proposes teams; humans lobby up manually.
- **Mobile-native app** — the web UI is responsive; that's enough.

### Not a goal: single offline file
- **Rift Roster is a hosted app, not a single offline HTML file.** A shared read-only link requires shared server state, which requires a (minimal) backend and hosting — incompatible with an open-one-file design. The tradeoff is deliberate and scoped tightly: the server stores/serves snapshots only; the engine remains client-side (see §6). The history of this decision lives in [CHANGELOG](CHANGELOG.md).

---

## 5. Success metrics

Personal, honest, observational — not analytics:

| Metric | Target | How I'll know |
|---|---|---|
| **Group survival** | Weekly lobby still running at week 8+ | It's still happening |
| **Competitiveness** | Most games not decided by 15 min | Vibe check + fewer 20-min surrenders |
| **Organizer effort** | <2 min from "who's in" to a published link | Self-timed |
| **Override rate** | I manually swap on <1 in 4 lobbies | If I'm always overriding, the model is wrong |
| **Link actually gets used** | The group opens the link before lobbying up | It comes up in chat / people stop asking "what are teams" |

The override rate is the real model-quality signal. Whether the link gets looked at is the signal for whether the *visibility* thesis holds. If nobody opens it, the server isn't worth it.

---

## 6. Key product decisions & rationale

- **Hosted + shareable, with a deliberately minimal backend.** The group needs *visible* fairness, not just fairness, and there's no way to share live state without shared state. The backend is accepted but contained to snapshot storage, and the engine stays client-side, so the system keeps roughly the same shape rather than becoming a full client-server app. (This reverses an original "no server" non-goal; the reasoning and history are in [CHANGELOG](CHANGELOG.md).)
- **Read-only sharing, not multi-user.** Viewers see; only the organizer edits. This buys ~90% of the transparency value for ~10% of the complexity of real accounts. No auth for viewers, one secret for the organizer.
- **Engine stays client-side and pure.** The interesting, tested part of the product does not live on the server. The server is dumb storage. This is what keeps the system cheap and the core reusable.
- **Rank as 6 coarse buckets, not divisions.** Divisions (I–IV) are false precision for a casual group. Six buckets (Iron/Bronze → Diamond+) with a non-linear jump at the top (Emerald→Diamond gap is genuinely bigger) is enough resolution to balance without demanding data nobody wants to enter.
- **Roles as strong preference, not hard lock.** Hard role-locking 10 casual players often makes teams *impossible* to form. Main = free, any listed secondary = cheap, off-role = expensive. A fill player lists every non-main role as secondary. Tunable.
- **Win rate nudges, never overrides.** Rank is the primary signal; form is a ±half-bucket adjustment that only kicks in with enough games to be meaningful.
- **Spread penalty over pure sum-matching.** One Master + four Silvers can sum-match five Golds but is not balanced — the Master snowballs. Penalizing internal variance and top-player gap is the core insight that makes the balancer better than a naive point-sum.
- **JSON import/export retained even with a backend.** It's the backup format and the >10 workflow (keep everyone in one file, flip `in` flags weekly). The server holds *published* snapshots; the file holds the *working* pool.
- **Near-optimal variety over one frozen answer.** The mathematical optimum stays available, but the organizer chooses among candidates within a small quality guardrail and remembers recent splits for the same cohort. Weekly repeats and Rebalance therefore create fresh teams without accepting additional off-role assignments.

---

## 7. Open questions

- Does form (win rate) actually improve balance, or is rank alone enough? Watch override rate with WR on vs off.
- Does the shared link actually get opened, or does the group not care? If unused after a few weeks, the backend was a mistake — say so and reconsider.
- Should a published link be editable/re-publishable in place (same slug) or always mint a new one? Leaning: re-publish overwrites the same slug so "the link" is stable week to week.
- Do published snapshots need an expiry, or is it fine to let them accumulate forever? Defer until storage is actually a concern.
- Is bench rotation worth building, or does the group self-manage who sits out? Defer until it's actually annoying.
- Would drag-to-swap reduce override friction enough to be worth the UI work?

---

## Changelog

- **1.2.0** (2026-07-17) — Added fresh repeat balancing as an organizer requirement and recorded the near-optimal variety decision.
- **1.1.0** (2026-07-16) — Expanded role preferences to support multiple secondary roles and fill players.
- **1.0.0** (2026-07-15) — Initial official version: hosted + shareable direction, with the Viewers user class, the read-only link as a first-class deliverable, and a deliberately minimal backend.
