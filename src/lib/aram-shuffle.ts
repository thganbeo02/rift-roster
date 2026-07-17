import type { Player } from "@/engine";

export interface AramTeams {
  teamA: Player[];
  teamB: Player[];
}

export function shuffleAramTeams(
  players: readonly Player[],
  rng: () => number = Math.random,
): AramTeams {
  if (players.length !== 10) {
    throw new RangeError("ARAM shuffle requires exactly 10 players");
  }

  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new Error("ARAM shuffle requires every player to have a unique id");
  }

  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(rng() * (index + 1)));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return {
    teamA: shuffled.slice(0, 5),
    teamB: shuffled.slice(5),
  };
}
