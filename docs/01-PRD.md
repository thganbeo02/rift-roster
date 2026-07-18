# Rift Roster — Product Requirements Document

> **Project:** Rift Roster (balancer engine: *Summoner Split*)
> **Author:** Zeros
> **Status:** hosted match journal · living doc
> **Doc version:** 2.0.0
> **Audience:** Personal reference

---

## 1. Why this exists

The CNTT department has 12–15 people who play League of Legends, but almost never the same 10 at once. Some play daily, some a few times a week, some once a week. Two failure modes kill a casual group like this:

1. **Scheduling entropy** — without a fixed ritual, "we should play sometime" never converges on an actual lobby.
2. **Blowout attrition** — when teams are unbalanced, the same people get stomped week after week and quietly stop showing up. A group dies from lopsided games faster than from anything else.

Rift Roster attacks the second problem directly: given whoever showed up this week, produce two teams of five that are as fair as the roster allows — accounting for rank, role, current form, and the group's known outliers. The scheduling ritual is a process wrapper around it (fixed weekly slot, confirm-in), not software.

Beyond producing fair teams, Rift Roster makes them **visible and accountable**. The organizer saves the agreed split as a read-only report before lobby-up, then can attach the real Riot result after the game. The report preserves both what the model predicted and what actually happened, so fairness is inspectable and the group builds a useful history instead of losing each lobby to chat scrollback.

This is a personal tool first and a portfolio artifact second. The server is deliberately bounded to planned-match persistence, read-only reports, organizer history, and explicit post-game Riot lookups. The balancing engine remains entirely client-side (see §6, TDD §1).

---

## 2. Users

| User | Role | Needs |
|---|---|---|
| **Organizer** (me) | Runs the weekly lobby, sole editor | Balance in <2 min, save the accepted plan, review history, and attach the finished Riot result |
| **Viewers** (players / anyone with the link) | Read-only | See the planned teams and, once confirmed, the completed result; no login or setup |

There is still exactly **one organizer** and **no player accounts**. Player data is entered and maintained by the organizer, not self-served. Viewers authenticate with nothing — possession of the link is the only "permission," and the link exposes no editing power.

---

## 3. Problem statement

> Given exactly 10 available players, produce a fair, playable 5v5 in under two minutes; save the accepted plan as a read-only report; and later attach the confirmed Riot result so the group can compare the model's prediction with the game that occurred—without player accounts.

The hard part is still not the split itself (126 combinations, trivially brute-forced). It's **modeling "strength" well enough that equal-on-paper teams are equal in practice** — smurfs, rusty players, one-tricks, role-dependent carry impact. The journal closes the feedback loop around that core: preserve the prediction, record the outcome, and make misses inspectable without silently training or retuning the model.

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

### In scope (hosted save + share)
- **Hosting:** the app runs at a public URL (no install, no offline-file handoff).
- **Save Team:** organizer saves an accepted plan as a durable match record and gets a shareable link `/v/<slug>`.
- **Read-only report:** anyone with the link sees the original teams, roles, and balance verdict; once confirmed, the same report also shows the result. No editing, engine re-run, or login.
- **Match history:** organizer can list saved matches, distinguish awaiting-result from completed reports, reopen them, and reuse their players.
- **Post-game Riot synchronization:** on explicit organizer action, the server finds likely Match-V5 results, the organizer confirms the correct match, and the normalized outcome is attached without changing the original plan.
- **Organizer working persistence:** localStorage for the in-progress roster, plus JSON import/export retained for backup and the >10 file-swap workflow.
- **Fresh repeat balancing:** remember recent splits for the same 10-player cohort and choose a different near-optimal arrangement on later balances/rebalances.
- **Minimal write protection:** a single organizer secret gates saves, history mutations, and Riot synchronization; no user/account system.

### In scope (v1.1 — still planned, see Roadmap)
- `peak` rank and manual `adjust` fields → stronger outlier modeling.
- `pairs` (together / apart) as hard constraints.

### Out of scope (deliberate non-goals)
- **Player accounts / self-service editing / multi-organizer** — there is one organizer; players are viewers, not editors. Adding accounts would be a genuinely different project.
- **Riot rank/stat auto-pull** — rank remains an organizer-maintained model input. Riot integration is limited to identifying and attaching a completed match result.
- **Automatic result attachment without confirmation** — candidate matching can be ambiguous when someone changes accounts or multiple games are played; the organizer confirms before a result becomes part of the report.
- **Live draft / in-client integration** — the tool proposes teams; humans lobby up manually.
- **Mobile-native app** — the web UI is responsive; that's enough.

### Not a goal: single offline file
- **Rift Roster is a hosted app, not a single offline HTML file.** Durable reports, history, and protected Riot API access require shared server state. The tradeoff is scoped: the server persists reports and synchronizes results, while the engine remains client-side (see §6).

---

## 5. Success metrics

Personal, honest, observational — not analytics:

| Metric | Target | How I'll know |
|---|---|---|
| **Group survival** | Weekly lobby still running at week 8+ | It's still happening |
| **Competitiveness** | Most games not decided by 15 min | Vibe check + fewer 20-min surrenders |
| **Organizer effort** | <2 min from "who's in" to a saved report link | Self-timed |
| **Override rate** | I manually swap on <1 in 4 lobbies | If I'm always overriding, the model is wrong |
| **Link actually gets used** | The group opens the link before lobbying up | It comes up in chat / people stop asking "what are teams" |
| **Result capture** | Most saved matches reach a confirmed result | Awaiting-result reports do not pile up indefinitely |
| **Model feedback** | Reports make obvious misses visible | Compare original score/verdict with actual outcomes over time |

The override rate is the real model-quality signal. Whether the link gets looked at is the signal for whether the *visibility* thesis holds. If nobody opens it, the server isn't worth it.

---

## 6. Key product decisions & rationale

- **Plans are immutable evidence; results enrich them.** Saving freezes the accepted teams, assigned roles, meter, and notes. Riot synchronization attaches an outcome but never rewrites the original prediction.
- **Bounded backend, pure client engine.** Shared reports and a protected Riot key require server code, but its authority is limited to persistence, reads, history operations, and explicit result lookup. It never balances or changes a plan.
- **Read-only sharing, not multi-user.** Viewers see; only the organizer edits. This buys ~90% of the transparency value for ~10% of the complexity of real accounts. No auth for viewers, one secret for the organizer.
- **Engine stays client-side and pure.** The interesting, tested part does not move to the server. Riot data is evidence about a finished game, not an input that reruns or silently tunes the engine.
- **Human confirmation before attaching Riot data.** Candidate lookup assists the organizer; it does not decide which match belongs to a report.
- **Rank as 6 coarse buckets, not divisions.** Divisions (I–IV) are false precision for a casual group. Six buckets (Iron/Bronze → Diamond+) with a non-linear jump at the top (Emerald→Diamond gap is genuinely bigger) is enough resolution to balance without demanding data nobody wants to enter.
- **Roles as strong preference, not hard lock.** Hard role-locking 10 casual players often makes teams *impossible* to form. Main = free, any listed secondary = cheap, off-role = expensive. A fill player lists every non-main role as secondary. Tunable.
- **Win rate nudges, never overrides.** Rank is the primary signal; form is a ±half-bucket adjustment that only kicks in with enough games to be meaningful.
- **Spread penalty over pure sum-matching.** One Master + four Silvers can sum-match five Golds but is not balanced — the Master snowballs. Penalizing internal variance and top-player gap is the core insight that makes the balancer better than a naive point-sum.
- **JSON import/export retained even with a backend.** It remains the roster backup and >10-player workflow. The server holds saved match records; the browser holds the working pool.
- **Near-optimal variety over one frozen answer.** The mathematical optimum stays available, but the organizer chooses among candidates within a small quality guardrail and remembers recent splits for the same cohort. Weekly repeats and Rebalance therefore create fresh teams without accepting additional off-role assignments.

---

## 7. Open questions

- Does form (win rate) actually improve balance, or is rank alone enough? Watch override rate with WR on vs off.
- Does the shared link actually get opened, or does the group not care? If unused after a few weeks, the backend was a mistake — say so and reconsider.
- How reliably do custom games appear in Match-V5 for the group's region and lobby setup? Prove this with real match IDs before building automatic candidate ranking.
- How many linked Riot identities are required before candidate matching is trustworthy? Prefer all ten; support manual match-ID fallback.
- How long should completed and abandoned reports be retained? Keep indefinitely until storage or privacy becomes real friction.
- Is bench rotation worth building, or does the group self-manage who sits out? Defer until it's actually annoying.
- Would drag-to-swap reduce override friction enough to be worth the UI work?

---

## Changelog

- **2.0.0** (2026-07-18) — Expanded the product from one-off snapshot sharing to immutable planned matches, organizer history, read-only reports, and confirmed post-game Riot result synchronization.
- **1.2.0** (2026-07-17) — Added fresh repeat balancing as an organizer requirement and recorded the near-optimal variety decision.
- **1.1.0** (2026-07-16) — Expanded role preferences to support multiple secondary roles and fill players.
- **1.0.0** (2026-07-15) — Initial official version: hosted + shareable direction, with the Viewers user class, the read-only link as a first-class deliverable, and a deliberately minimal backend.
