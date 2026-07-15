# Rift Roster — Roadmap

> **Author:** Zeros
> **Status:** living doc
> **Doc version:** 1.0.0
> **Audience:** Personal reference

Scoping principle for this project: **ship the balancer, defer everything that isn't proven annoying yet.** Features earn their way in by real friction observed during weekly use, not by being on a wishlist. The "why deferred" column is the important one — it's the record of *decisions*, so future me doesn't re-litigate them. When a decision is reversed, that goes in the [CHANGELOG](CHANGELOG.md) with its reasoning, not silently.

---

## ✅ v1 — Shipped (engine)

The working balancer. Enough to run a real weekly lobby.

- Roster table: name, rank bucket, main/secondary role, wins/games, in/out flag.
- **Summoner Split** engine: 126-split exhaustive search, optimal.
- Scoring: rankDiff + spread penalty + role fit.
- Win-rate confidence weighting (5-game floor, ramp to 20).
- Split-top-2 constraint.
- Balance meter (verdict + score gap), role badges, balance notes with outlier warnings.
- Fun mode (ARAM shuffle).
- JSON import/export as persistence.
- Hextech-console UI.

**Exit criteria met:** can go from "here's who's in" to two teams in under two minutes.

---

## 🔜 v1.5 — Hosted + shareable (current focus)

Turn the private engine into a hosted app that produces a **read-only shareable link** so the whole group can see the teams. Feature set stays v1; this is architecture, not new balancing.

| Item | What | Why now |
|---|---|---|
| **Hosting** | Next.js app on Vercel, deployed on `git push` | Others can't view a file on my disk. A URL is the price of shared visibility. |
| **Publish + view link** | Organizer publishes a snapshot → `/v/<slug>`; anyone opens it read-only | The actual goal: the group sees the split before lobby-up, so fairness is *visible*, not just claimed. |
| **Snapshot backend** | KV store of snapshot blobs keyed by slug; one secret gates writes | Minimal shared state. No accounts, no DB schema, engine stays client-side. |
| **localStorage working state** | Persist the in-progress roster across refreshes | Now possible (hosted), removes the weekly re-import friction the old design had. |
| **React + TypeScript + Vitest** | Migrate the vanilla scaffold to the stack in the TDD | DX for a real interactive app; keeps the pure engine unit-tested. |

**Trigger to build:** now — this is the active work item.

**Explicit guardrail:** the server stores/serves snapshots and nothing else. The moment it starts running the engine, holding accounts, or editing on behalf of users, stop and re-read this line.

---

## 🔜 v1.1 — Stronger model (still planned, after v1.5)

The three fields that most improve balance per unit of data-entry effort. Backward-compatible import (old flat-array files still load).

| Item | What | Why |
|---|---|---|
| **`peak` rank** | Peak-rank bucket, blended 70/30 with current | Direct fix for smurfs/rusty players — the outlier case that motivated the spread penalty. Cheap to collect. |
| **`adjust` nudge** | Manual −1..+2 bucket shift, applied last | Organizer override for what numbers can't see. One field, rarely changes, high leverage. |
| **`pairs`** | `together` / `apart` relationships as hard constraints | Synergy and tilt change game outcomes more than any single-player stat, and they're invisible to rank. Clean to implement — just prune the search. |
| Schema shift | Array → `{players, pairs}`, importer accepts both | Needed to carry `pairs`; keep old files working. |

**Trigger to build:** once the hosted base is running and a few lobbies confirm the model works — then add these to sharpen it.

---

## 🤔 v2 — If friction appears

Everything here is real but unproven-necessary. Each has an explicit trigger; if the trigger never fires, it never gets built.

| Item | What | Build only if… |
|---|---|---|
| **Drag-to-swap** | Move a player between teams post-balance, meter updates live, re-publish | …I'm overriding often enough that edit-and-rerun is annoying. Watch the override rate (PRD metric). |
| **Bench rotation** | `lastSatOut` → auto-suggest who sits when >10 are in | …the group stops self-managing who benches and the same junior always misses out. |
| **Recent form (last-5)** | More responsive than season WR | …games get sweaty enough that "who's hot" matters and season WR feels too sluggish. |
| **Role-weighted outliers** | Fold role-impact weights into the core score, not just warnings | …a strong jungle vs strong support keeps producing games that felt unbalanced despite equal scores. |
| **Snapshot history / expiry** | List past weeks; TTL cleanup | …snapshots pile up and it's either useful (history) or a nuisance (cleanup). |

---

## ❄️ Deferred indefinitely (still no, for the record)

Not "later" — these are **no** unless the project's whole purpose changes.

- **Accounts / multi-user / self-service player editing / multi-group** — there is one organizer; players are viewers. Real auth and per-user data is a different, bigger project. This is the line the minimal snapshot backend deliberately does *not* cross.
- **Riot API rank auto-pull** — adds auth, rate limits, a build step, CORS pain. Manual dropdown entry is <30s for the whole roster. Not worth it for 15 people.
- **Champion pools / KDA / CS stats** — too granular, ego-noisy, never kept current. Rank already encapsulates them.
- **In-client / live-draft integration** — the tool proposes; humans lobby up. Fine.
- **Mobile-native app** — responsive web is enough.

---

## Portfolio framing (if I ever surface this)

Even though these docs are for me, the project reads well externally as *product thinking + real algorithms + scoping judgment*:

- **Product thinking** — solves an actual behavioral problem (blowout attrition), and the hosted/shareable direction is driven by a real second-order need (visible fairness), not feature-chasing.
- **Algorithms** — optimal exhaustive search, an assignment sub-problem, a confidence-weighted scoring model, and a genuinely non-obvious variance/spread insight for outliers.
- **Full-stack** — a hosted Next.js app with a deliberately minimal backend, a clean client/server split that keeps the pure engine testable, and a shareable read-only view.
- **Scoping** — this roadmap itself: shipped lean, deferred with reasons, and recorded reversals in the CHANGELOG rather than pretending each choice was always the plan.

The one-liner: *"A hosted team balancer for my coworkers' weekly League games that models skill well enough that equal-on-paper teams are actually equal — handling smurfs, roles, form, and known duo/tilt pairs — and shares the result with the group through a read-only link."*

---

## Changelog

- **1.0.0** (2026-07-15) — Initial official version: v1.5 "Hosted + shareable" as the current focus; accounts/multi-user deferred indefinitely.
