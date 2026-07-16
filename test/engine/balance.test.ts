import { describe, expect, it } from "vitest";

import { balance } from "@/engine/balance";
import type { Player, RankIndex } from "@/engine/types";
import { makePlayer } from "../fixtures/make-player";

function makeRoster(
  ranks: readonly RankIndex[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
): Player[] {
  return ranks.map((rank, index) =>
    makePlayer(`p${index}`, {
      rank,
    }),
  );
}

describe("balance", () => {
  it("requires exactly 10 players", () => {
    expect(() => balance(makeRoster().slice(0, 9))).toThrow(RangeError);
  });

  it("requires unique player ids", () => {
    const players = makeRoster();

    players[9] = {
      ...players[9],
      id: players[0].id,
    };

    expect(() => balance(players)).toThrow(
      "balance requires every player to have a unique id",
    );
  });

  it("evaluates 126 unique splits when split-top-two is disabled", () => {
    const result = balance(makeRoster(), {
      splitTopTwo: false,
      spreadWeight: 0,
      roleWeight: 0,
    });

    expect(result.evaluatedSplits).toBe(126);
  });

  it("evaluates 70 splits when the strongest two must be separated", () => {
    const result = balance(makeRoster([0, 0, 1, 1, 2, 2, 3, 3, 4, 5]), {
      splitTopTwo: true,
      spreadWeight: 0,
      roleWeight: 0,
    });

    expect(result.evaluatedSplits).toBe(70);
  });

  it("separates the strongest two players", () => {
    const players = makeRoster([0, 0, 1, 1, 2, 2, 3, 3, 4, 5]);

    const result = balance(players, {
      splitTopTwo: true,
      spreadWeight: 0,
      roleWeight: 0,
    });

    const teamAIds = new Set(result.teamA.players.map((player) => player.id));

    const strongestOneInTeamA = teamAIds.has("p9");
    const strongestTwoInTeamA = teamAIds.has("p8");

    expect(strongestOneInTeamA).not.toBe(strongestTwoInTeamA);
  });

  it("rejects the both-in-Team-B case for the strongest two", () => {
    const players = makeRoster([
      3, // 400
      2, // 300
      2, // 300
      2, // 300
      2, // 300
      0, // 100
      0, // 100
      0, // 100
      5, // 650
      5, // 650
    ]);

    const unconstrained = balance(players, {
      splitTopTwo: false,
      spreadWeight: 0,
      roleWeight: 0,
    });

    expect(unconstrained.teamB.players.map((player) => player.id)).toEqual([
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
    ]);

    const constrained = balance(players, {
      splitTopTwo: true,
      spreadWeight: 0,
      roleWeight: 0,
    });

    const constrainedTeamAIds = new Set(
      constrained.teamA.players.map((player) => player.id),
    );

    expect(constrainedTeamAIds.has("p8")).not.toBe(
      constrainedTeamAIds.has("p9"),
    );
  });

  it("breaks equal-score ties by combination order", () => {
    const result = balance(makeRoster(), {
      splitTopTwo: false,
      spreadWeight: 0,
      roleWeight: 0,
    });

    expect(result.teamA.players.map((player) => player.id)).toEqual([
      "p0",
      "p1",
      "p2",
      "p3",
      "p4",
    ]);

    expect(result.teamB.players.map((player) => player.id)).toEqual([
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
    ]);
  });

  it("returns two complete teams without duplicate players", () => {
    const result = balance(makeRoster(), {
      splitTopTwo: false,
    });

    const allIds = [...result.teamA.players, ...result.teamB.players].map(
      (player) => player.id,
    );

    expect(result.teamA.players).toHaveLength(5);
    expect(result.teamB.players).toHaveLength(5);
    expect(new Set(allIds)).toHaveLength(10);
  });
});
