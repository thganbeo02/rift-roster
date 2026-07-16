import { describe, expect, it } from "vitest";

import { scoreSplit } from "@/engine/score-split";
import { ROLES, type Player, type RankIndex } from "@/engine/types";
import { makePlayer } from "../fixtures/make-player";

function makeTeam(prefix: string, ranks: readonly RankIndex[]): Player[] {
  return ROLES.map((role, index) =>
    makePlayer(`${prefix}-${index}`, {
      rank: ranks[index],
      mainRole: role,
    }),
  );
}

describe("scoreSplit", () => {
  it("returns a zero score for identical team strength and role shape", () => {
    const ranks: RankIndex[] = [2, 2, 2, 2, 2];
    const result = scoreSplit(makeTeam("a", ranks), makeTeam("b", ranks));

    expect(result.teamA.effectiveScore).toBe(1500);
    expect(result.teamB.effectiveScore).toBe(1500);
    expect(result.teamA.roleFit.penalty).toBe(0);
    expect(result.teamB.roleFit.penalty).toBe(0);
    expect(result.score).toEqual({
      rankDifference: 0,
      spreadPenalty: 0,
      rolePenalty: 0,
      total: 0,
    });
  });

  it("applies configured spread and role weights to the total", () => {
    const teamA = Array.from({ length: 5 }, (_, index) =>
      makePlayer(`a-${index}`, {
        rank: 2,
        mainRole: "Mid",
      }),
    );
    const teamB = makeTeam("b", [1, 2, 2, 2, 3]);

    const result = scoreSplit(teamA, teamB, {
      spreadWeight: 2,
      roleWeight: 10,
    });

    expect(result.score.rankDifference).toBe(0);
    expect(result.score.rolePenalty).toBe(12);
    expect(result.score.total).toBeCloseTo(
      result.score.rankDifference +
        2 * result.score.spreadPenalty +
        10 * result.score.rolePenalty,
    );
  });

  it("returns complete role assignments for both teams", () => {
    const ranks: RankIndex[] = [2, 2, 2, 2, 2];
    const result = scoreSplit(makeTeam("a", ranks), makeTeam("b", ranks));

    expect(result.teamA.roleFit.assignments).toHaveLength(5);
    expect(result.teamB.roleFit.assignments).toHaveLength(5);
  });
});
