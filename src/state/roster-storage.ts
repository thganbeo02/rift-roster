import { RANKS, ROLES, type RankIndex, type Role } from "@/engine";
import type { RosterPlayer } from "@/state/roster";

export const ROSTER_STORAGE_KEY = "rift-roster:organizer-roster";

type StoredRoster = {
  version: 1;
  players: readonly RosterPlayer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

function rankIndex(value: unknown): RankIndex {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(RANKS.length - 1, Math.max(0, Math.trunc(value))) as RankIndex;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function stableId(
  value: unknown,
  index: number,
  existingIds: ReadonlySet<string>,
): string {
  const requested = typeof value === "string" ? value.trim() : "";
  const base = requested || `stored-player-${index + 1}`;
  let candidate = base;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizePlayer(
  value: unknown,
  index: number,
  existingIds: ReadonlySet<string>,
): RosterPlayer | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = stableId(value.id, index, existingIds);
  const mainRole = isRole(value.mainRole) ? value.mainRole : "Top";
  const secondaryRoles = Array.isArray(value.secondaryRoles)
    ? [
        ...new Set(
          value.secondaryRoles.filter(
            (role): role is Role => isRole(role) && role !== mainRole,
          ),
        ),
      ]
    : [];

  const player: RosterPlayer = {
    id,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : `Player ${index + 1}`,
    rank: rankIndex(value.rank),
    mainRole,
    secondaryRoles,
    wins: nonNegativeInteger(value.wins),
    games: nonNegativeInteger(value.games),
    in: typeof value.in === "boolean" ? value.in : true,
    source: value.source === "generated" ? "generated" : "manual",
  };

  if (typeof value.peak === "number" && Number.isFinite(value.peak)) {
    player.peak = rankIndex(value.peak);
  }

  if (typeof value.adjust === "number" && Number.isFinite(value.adjust)) {
    player.adjust = value.adjust;
  }

  return player;
}

export function serializeRoster(roster: readonly RosterPlayer[]): string {
  const stored: StoredRoster = {
    version: 1,
    players: roster,
  };

  return JSON.stringify(stored);
}

export function parseRoster(value: string | null): RosterPlayer[] {
  if (!value) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.players)
      ? parsed.players
      : [];
  const players: RosterPlayer[] = [];
  const ids = new Set<string>();

  candidates.forEach((candidate, index) => {
    const player = normalizePlayer(candidate, index, ids);
    if (player) {
      players.push(player);
      ids.add(player.id);
    }
  });

  return players;
}
