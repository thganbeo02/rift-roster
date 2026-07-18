import { balanceMeter } from "@/lib/balance-meter";
import { isPublishSlug, PUBLISH_SLUG_LENGTH } from "@/lib/publish-slug";
import { ROLES, type BalanceResult, type RankIndex, type Role } from "@/engine";

export const SNAPSHOT_LIMITS = {
  slugLength: PUBLISH_SLUG_LENGTH,
  labelLength: 80,
  playerNameLength: 40,
  verdictLength: 40,
  noteLength: 240,
  notes: 8,
} as const;

export interface SnapshotPlayer {
  name: string;
  rank: RankIndex;
  role: Role;
  offRole: boolean;
}

export type SnapshotTeam = SnapshotPlayer[];

export interface Snapshot {
  slug: string;
  createdAt: number;
  label?: string;
  teams: {
    a: SnapshotTeam;
    b: SnapshotTeam;
  };
  meter: {
    verdict: string;
    gap: number;
  };
  notes: string[];
}

export interface SerializeSnapshotInput {
  slug: string;
  createdAt: number;
  label?: string;
  result: BalanceResult;
  notes: readonly string[];
}

export type SnapshotValidationResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; error: string };

const SNAPSHOT_KEYS = ["slug", "createdAt", "label", "teams", "meter", "notes"];
const PLAYER_KEYS = ["name", "rank", "role", "offRole"];
const TEAMS_KEYS = ["a", "b"];
const METER_KEYS = ["verdict", "gap"];

function snapshotTeam(result: BalanceResult["teamA"]): SnapshotTeam {
  return result.roleFit.assignments.map((assignment) => ({
    name: assignment.player.name,
    rank: assignment.player.rank,
    role: assignment.role,
    offRole: assignment.preference === "off",
  }));
}

export function serializeSnapshot(input: SerializeSnapshotInput): Snapshot {
  return {
    slug: input.slug,
    createdAt: input.createdAt,
    ...(input.label === undefined ? {} : { label: input.label }),
    teams: {
      a: snapshotTeam(input.result.teamA),
      b: snapshotTeam(input.result.teamB),
    },
    meter: {
      verdict: balanceMeter(input.result).verdict,
      gap: Math.abs(
        input.result.teamA.effectiveScore - input.result.teamB.effectiveScore,
      ),
    },
    notes: [...input.notes],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maximum
  );
}

function isRank(value: unknown): value is RankIndex {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5;
}

function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

function isSnapshotPlayer(value: unknown): value is SnapshotPlayer {
  if (!isRecord(value) || !hasOnlyKeys(value, PLAYER_KEYS)) return false;

  return (
    isBoundedString(value.name, SNAPSHOT_LIMITS.playerNameLength) &&
    isRank(value.rank) &&
    isRole(value.role) &&
    typeof value.offRole === "boolean"
  );
}

function isSnapshotTeam(value: unknown): value is SnapshotTeam {
  if (!Array.isArray(value) || value.length !== 5) return false;
  if (!value.every(isSnapshotPlayer)) return false;

  return new Set(value.map((player) => player.role)).size === ROLES.length;
}

function validateSnapshot(value: unknown): value is Snapshot {
  if (!isRecord(value) || !hasOnlyKeys(value, SNAPSHOT_KEYS)) return false;
  if (!isPublishSlug(value.slug)) return false;
  if (!Number.isSafeInteger(value.createdAt) || Number(value.createdAt) < 0) {
    return false;
  }
  if (
    value.label !== undefined &&
    !isBoundedString(value.label, SNAPSHOT_LIMITS.labelLength)
  ) {
    return false;
  }
  if (!isRecord(value.teams) || !hasOnlyKeys(value.teams, TEAMS_KEYS)) {
    return false;
  }
  if (!isSnapshotTeam(value.teams.a) || !isSnapshotTeam(value.teams.b)) {
    return false;
  }
  if (!isRecord(value.meter) || !hasOnlyKeys(value.meter, METER_KEYS)) {
    return false;
  }
  if (!isBoundedString(value.meter.verdict, SNAPSHOT_LIMITS.verdictLength)) {
    return false;
  }
  if (
    typeof value.meter.gap !== "number" ||
    !Number.isFinite(value.meter.gap) ||
    value.meter.gap < 0
  ) {
    return false;
  }
  if (
    !Array.isArray(value.notes) ||
    value.notes.length > SNAPSHOT_LIMITS.notes
  ) {
    return false;
  }

  return value.notes.every((note) =>
    isBoundedString(note, SNAPSHOT_LIMITS.noteLength),
  );
}

export function parseSnapshot(value: unknown): SnapshotValidationResult {
  if (!validateSnapshot(value)) {
    return { ok: false, error: "The snapshot payload is invalid." };
  }

  return { ok: true, snapshot: value };
}
