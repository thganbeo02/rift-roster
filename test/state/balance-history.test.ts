import { describe, expect, it } from "vitest";

import type { BalanceResult, Player } from "@/engine";
import {
  addRecentSplit,
  balanceCohortKey,
  chooseFreshBalance,
  MAX_RECENT_SPLITS,
  parseBalanceHistory,
  serializeBalanceHistory,
  splitSignature,
  type BalanceHistory,
} from "@/state/balance-history";
import { makePlayer } from "../fixtures/make-player";

function result(
  teamAIds: readonly string[],
  teamBIds: readonly string[],
  total: number,
  offRoles: number = 0,
): BalanceResult {
  const team = (ids: readonly string[], firstTeam: boolean) => ({
    players: ids.map((id) => makePlayer(id)),
    effectiveScore: 0,
    roleFit: {
      penalty: 0,
      assignments: ids.map((id, index) => ({
        player: makePlayer(id),
        role: "Mid" as const,
        preference:
          firstTeam && index < offRoles ? ("off" as const) : ("main" as const),
        cost: firstTeam && index < offRoles ? 3 : 0,
      })),
    },
  });

  return {
    teamA: team(teamAIds, true),
    teamB: team(teamBIds, false),
    score: {
      rankDifference: 0,
      spreadPenalty: 0,
      rolePenalty: offRoles * 3,
      total,
    },
    evaluatedSplits: 3,
  };
}

const splitA = result(["a", "b", "c", "d", "e"], ["f", "g", "h", "i", "j"], 10);
const splitB = result(["a", "b", "c", "d", "f"], ["e", "g", "h", "i", "j"], 30);
const splitC = result(["a", "b", "c", "d", "g"], ["e", "f", "h", "i", "j"], 140);

describe("balance history", () => {
  it("creates order-independent cohort and split signatures", () => {
    const players: Player[] = [makePlayer("b"), makePlayer("a")];
    const mirrored = result(
      ["j", "i", "h", "g", "f"],
      ["e", "d", "c", "b", "a"],
      10,
    );

    expect(balanceCohortKey(players)).toBe("a|b");
    expect(splitSignature(mirrored)).toBe(splitSignature(splitA));
  });

  it("avoids recent signatures while staying near optimal", () => {
    const selection = chooseFreshBalance(
      [splitA, splitB, splitC],
      [splitSignature(splitA)],
      () => 0,
    );

    expect(selection.result).toBe(splitB);
    expect(selection.optimalCost).toBe(10);
    expect(selection.eligibleCandidates).toBe(2);
    expect(selection.historyExhausted).toBe(false);
  });

  it("does not accept alternatives with additional off-role assignments", () => {
    const offRoleAlternative = result(
      ["a", "b", "c", "d", "f"],
      ["e", "g", "h", "i", "j"],
      20,
      1,
    );

    const selection = chooseFreshBalance(
      [splitA, offRoleAlternative],
      [splitSignature(splitA)],
      () => 0,
    );

    expect(selection.result).toBe(splitA);
    expect(selection.historyExhausted).toBe(true);
  });

  it("keeps recent signatures unique and bounded", () => {
    let history: BalanceHistory = {};
    for (let index = 0; index < MAX_RECENT_SPLITS + 3; index += 1) {
      history = addRecentSplit(history, "cohort", `split-${index}`);
    }

    history = addRecentSplit(history, "cohort", "split-5");

    expect(history.cohort).toHaveLength(MAX_RECENT_SPLITS);
    expect(history.cohort[0]).toBe("split-5");
    expect(new Set(history.cohort).size).toBe(MAX_RECENT_SPLITS);
  });

  it("round-trips valid history and rejects malformed storage", () => {
    const history = { cohort: ["one", "two"] };

    expect(parseBalanceHistory(serializeBalanceHistory(history))).toEqual(history);
    expect(parseBalanceHistory("bad-json")).toEqual({});
    expect(parseBalanceHistory('["wrong"]')).toEqual({});
  });
});
