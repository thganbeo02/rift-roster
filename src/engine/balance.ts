import { kCombos } from "@/engine/combinations";
import { effScore } from "@/engine/eff-score";
import { scoreSplit } from "@/engine/score-split";
import type {
  BalanceOptions,
  BalanceResult,
  Player,
  SplitEvaluation,
} from "@/engine/types";

const PLAYER_COUNT = 10;
const TEAM_SIZE = 5;

function validatePlayers(players: readonly Player[]): void {
  if (players.length !== PLAYER_COUNT) {
    throw new RangeError(`balance requires exactly ${PLAYER_COUNT} players`);
  }

  const uniqueIds = new Set(players.map((player) => player.id));

  if (uniqueIds.size !== players.length) {
    throw new Error("balance requires every player to have a unique id");
  }
}

function strongestPlayerIndices(
  players: readonly Player[],
  useWinRate: boolean,
): [number, number] {
  const indices = players.map((_, index) => index);

  indices.sort((indexA, indexB) => {
    const scoreDifference =
      effScore(players[indexB], { useWinRate }) -
      effScore(players[indexA], { useWinRate });

    // Preserve input order when effective scores are equal.
    return scoreDifference || indexA - indexB;
  });

  return [indices[0], indices[1]];
}

function topPlayersShareTeam(
  teamAIndices: ReadonlySet<number>,
  topOneIndex: number,
  topTwoIndex: number,
): boolean {
  return teamAIndices.has(topOneIndex) === teamAIndices.has(topTwoIndex);
}

export function balance(
  players: readonly Player[],
  options: BalanceOptions = {},
): BalanceResult {
  return rankBalanceCandidates(players, options)[0];
}

export function rankBalanceCandidates(
  players: readonly Player[],
  {
    useWinRate = true,
    splitTopTwo = true,
    spreadWeight,
    roleWeight,
  }: BalanceOptions = {},
): BalanceResult[] {
  validatePlayers(players);

  const [topOneIndex, topTwoIndex] = strongestPlayerIndices(
    players,
    useWinRate,
  );

  const candidates: SplitEvaluation[] = [];

  for (const combination of kCombos(PLAYER_COUNT, TEAM_SIZE)) {
    // Team A must contain index 0, removing mirrored duplicates.
    if (!combination.includes(0)) {
      continue;
    }

    const teamAIndices = new Set(combination);

    if (
      splitTopTwo &&
      topPlayersShareTeam(teamAIndices, topOneIndex, topTwoIndex)
    ) {
      continue;
    }

    const teamA: Player[] = [];
    const teamB: Player[] = [];

    players.forEach((player, index) => {
      if (teamAIndices.has(index)) {
        teamA.push(player);
      } else {
        teamB.push(player);
      }
    });

    const evaluated = scoreSplit(teamA, teamB, {
      useWinRate,
      spreadWeight,
      roleWeight,
    });

    candidates.push(evaluated);
  }

  if (candidates.length === 0) {
    throw new Error("balance could not find a valid split");
  }

  // Array.sort is stable, preserving combination order when totals tie.
  candidates.sort((a, b) => a.score.total - b.score.total);

  return candidates.map((candidate) => ({
    ...candidate,
    evaluatedSplits: candidates.length,
  }));
}
