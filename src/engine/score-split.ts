import { DEFAULT_WEIGHTS } from "@/engine/constants";
import { effScore } from "@/engine/eff-score";
import { roleFit } from "@/engine/role-fit";
import { spreadPenalty } from "@/engine/spread-penalty";
import type {
  BalanceOptions,
  Player,
  SplitEvaluation,
  TeamEvaluation,
} from "@/engine/types";

export type ScoreSplitOptions = Pick<
  BalanceOptions,
  "useWinRate" | "spreadWeight" | "roleWeight"
>;

function evaluateTeam(
  players: readonly Player[],
  useWinRate: boolean,
): TeamEvaluation & { scores: number[] } {
  const scores = players.map((player) =>
    effScore(player, {
      useWinRate,
    }),
  );

  return {
    players: [...players],
    effectiveScore: scores.reduce((total, score) => total + score, 0),
    roleFit: roleFit(players),
    scores,
  };
}

export function scoreSplit(
  teamAPlayers: readonly Player[],
  teamBPlayers: readonly Player[],
  {
    useWinRate = true,
    spreadWeight = DEFAULT_WEIGHTS.spread,
    roleWeight = DEFAULT_WEIGHTS.role,
  }: ScoreSplitOptions = {},
): SplitEvaluation {
  const teamA = evaluateTeam(teamAPlayers, useWinRate);
  const teamB = evaluateTeam(teamBPlayers, useWinRate);

  const rankDifference = Math.abs(
    teamA.effectiveScore - teamB.effectiveScore,
  );
  const spread = spreadPenalty(teamA.scores, teamB.scores);
  const rolePenalty = teamA.roleFit.penalty + teamB.roleFit.penalty;
  const total =
    rankDifference + spreadWeight * spread + roleWeight * rolePenalty;

  const { scores: _teamAScores, ...teamAEvaluation } = teamA;
  const { scores: _teamBScores, ...teamBEvaluation } = teamB;

  return {
    teamA: teamAEvaluation,
    teamB: teamBEvaluation,
    score: {
      rankDifference,
      spreadPenalty: spread,
      rolePenalty,
      total,
    },
  };
}
