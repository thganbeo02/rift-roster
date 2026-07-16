import { FORM, RANKS } from "@/engine/constants";
import type { Player, RankIndex } from "@/engine/types";

export interface EffectiveScoreOptions {
  useWinRate?: boolean;
}

function clampRank(rank: number): RankIndex {
  const integerRank = rank | 0;
  const clampedRank = Math.max(0, Math.min(RANKS.length - 1, integerRank));

  return clampedRank as RankIndex;
}

export function effScore(
  player: Player,
  { useWinRate = true }: EffectiveScoreOptions = {},
): number {
  const currentRankScore = RANKS[clampRank(player.rank)].score;

  let score = currentRankScore;

  if (Number.isInteger(player.peak)) {
    const peakRankScore = RANKS[clampRank(player.peak as number)].score;

    score = 0.7 * currentRankScore + 0.3 * peakRankScore;
  }

  if (useWinRate && player.games >= FORM.minimumGames) {
    const winrate = player.wins / player.games;

    const confidence = Math.min(
      1,
      (player.games - FORM.minimumGames) /
        (FORM.fullConfidenceGames - FORM.minimumGames),
    );

    score += (winrate - 0.5) * 2 * FORM.maximumAdjustment * confidence;
  }

  score += (player.adjust || 0) * 100;

  return score;
}
