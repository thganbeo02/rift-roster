# Rift Roster — Roadmap

> **Author:** Zeros
> **Status:** living doc
> **Audience:** Personal reference

Scoping principle for this project: **ship the balancer, defer everything that isn't proven annoying yet.** Features earn their way in by real friction observed during weekly use, not by being on a wishlist. The "why deferred" column is the important one — it's the record of *decisions*, so future me doesn't re-litigate them.

---

## ✅ v1 — Shipped

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

## 🔜 v1.1 — Stronger model (next)

The three fields that most improve balance per unit of data-entry effort. Backward-compatible import (old flat-array files still load).

| Item | What | Why now |
|---|---|---|
| **`peak` rank** | Peak-rank bucket, blended 70/30 with current | Direct fix for smurfs/rusty players — the outlier case that motivated the spread penalty. Cheap to collect. |
| **`adjust` nudge** | Manual −1..+2 bucket shift, applied last | Organizer override for what numbers can't see. One field, rarely changes, high leverage. |
| **`pairs`** | `together` / `apart` relationships as hard constraints | Synergy and tilt change game outcomes more than any single-player stat, and they're invisible to rank. Clean to implement — just prune the search. |
| Schema shift | Array → `{players, pairs}`, importer accepts both | Needed to carry `pairs`; keep old files working. |

**Trigger to build:** as soon as I've run ~3–4 lobbies and confirmed the base model works — then add these to sharpen it.

---

## 🤔 v2 — If friction appears

Everything here is real but unproven-necessary. Each has an explicit trigger; if the trigger never fires, it never gets built.

| Item | What | Build only if… |
|---|---|---|
| **Drag-to-swap** | Move a player between teams post-balance, meter updates live | …I'm overriding often enough that edit-and-rerun is annoying. Watch the override rate (PRD metric). |
| **Bench rotation** | `lastSatOut` → auto-suggest who sits when >10 are in | …the group stops self-managing who benches and the same junior always misses out. |
| **Recent form (last-5)** | More responsive than season WR | …games get sweaty enough that "who's hot" matters and season WR feels too sluggish. |
| **Role-weighted outliers** | Fold role-impact weights into the core score, not just warnings | …a strong jungle vs strong support keeps producing games that felt unbalanced despite equal scores. |

---

## ❄️ Deferred indefinitely (decided against, for the record)

Not "later" — these are **no** unless the project's whole purpose changes. Writing them down so I don't waste an evening rebuilding the case.

- **Riot API rank auto-pull** — adds auth, rate limits, a build step, CORS pain. Manual dropdown entry is <30s for the whole roster. Not worth it for 15 people.
- **Backend / accounts / multi-group** — destroys the "open one file, works offline" property that makes the tool pleasant. The moment there's a server, it's a different (worse) project.
- **Champion pools / KDA / CS stats** — too granular, ego-noisy, never kept current. Rank already encapsulates them.
- **In-client / live-draft integration** — the tool proposes; humans lobby up. Fine.
- **Mobile-native app** — responsive HTML is enough.

---

## Portfolio framing (if I ever surface this)

Even though these docs are for me, the project reads well externally as *product thinking + real algorithms + scoping judgment*:

- **Product thinking** — solves an actual behavioral problem (blowout attrition), not a toy.
- **Algorithms** — optimal exhaustive search, an assignment sub-problem, a confidence-weighted scoring model, and a genuinely non-obvious variance/spread insight for outliers.
- **Scoping** — this roadmap itself: shipped lean, deferred with reasons, said no on purpose.

The one-liner: *"A team balancer for my coworkers' weekly League games that models skill well enough that equal-on-paper teams are actually equal — handling smurfs, roles, form, and known duo/tilt pairs."*
