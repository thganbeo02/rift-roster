import type { Player } from "@/engine/types";

export function makePlayer(
  id: string,
  overrides: Partial<Player> = {},
): Player {
  return {
    id,
    name: id,
    rank: 2,
    mainRole: "Mid",
    secondaryRoles: [],
    wins: 0,
    games: 0,
    ...overrides,
  };
}
