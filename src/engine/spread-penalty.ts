const STANDARD_DEVIATION_WEIGHT = 0.6;
const STRONGEST_PLAYER_WEIGHT = 0.5;

function standardDeviation(scores: readonly number[]): number {
  const mean = scores.reduce((total, score) => total + score, 0) / scores.length;
  const variance =
    scores.reduce((total, score) => total + (score - mean) ** 2, 0) /
    scores.length;

  return Math.sqrt(variance);
}

export function spreadPenalty(
  teamAScores: readonly number[],
  teamBScores: readonly number[],
): number {
  if (teamAScores.length === 0 || teamBScores.length === 0) {
    throw new RangeError("spreadPenalty requires two non-empty teams");
  }

  const deviationDifference = Math.abs(
    standardDeviation(teamAScores) - standardDeviation(teamBScores),
  );

  const strongestPlayerGap = Math.abs(
    Math.max(...teamAScores) - Math.max(...teamBScores),
  );

  return (
    deviationDifference * STANDARD_DEVIATION_WEIGHT +
    strongestPlayerGap * STRONGEST_PLAYER_WEIGHT
  );
}
