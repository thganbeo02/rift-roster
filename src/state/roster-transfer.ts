import type { RosterPlayer } from "@/state/roster";
import { parseRoster } from "@/state/roster-storage";

export type RosterImportResult =
  | { ok: true; players: RosterPlayer[] }
  | { ok: false; error: string };

export function exportRoster(roster: readonly RosterPlayer[]): string {
  return JSON.stringify({ players: roster }, null, 2);
}

export function importRoster(value: string): RosterImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, error: "The selected file is not valid JSON." };
  }

  const isObject =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  const objectPlayers = isObject
    ? (parsed as Record<string, unknown>).players
    : undefined;
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(objectPlayers)
      ? objectPlayers
      : undefined;

  if (!candidates) {
    return {
      ok: false,
      error: "The file must contain a player array or an object with players.",
    };
  }

  if (candidates.some((candidate) => typeof candidate !== "object" || candidate === null)) {
    return { ok: false, error: "Every imported player must be an object." };
  }

  return { ok: true, players: parseRoster(value) };
}
