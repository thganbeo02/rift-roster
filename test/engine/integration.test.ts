import { describe, expect, it } from "vitest";

import { balance, type Player } from "@/engine/index";
import { ROLES } from "@/engine/types";
import { playerPool } from "../fixtures/players";

const selectedPlayers = playerPool.filter(
  (player) => player.id !== "van-hai",
);

describe("Summoner Split integration", () => {
  it("balances a realistic 10-player roster end to end", () => {
    const result = balance(selectedPlayers);
    const allPlayers = [...result.teamA.players, ...result.teamB.players];

    expect(result.teamA.players).toHaveLength(5);
    expect(result.teamB.players).toHaveLength(5);
    expect(new Set(allPlayers.map((player) => player.id))).toHaveLength(10);

    expect(
      result.teamA.roleFit.assignments
        .map((assignment) => assignment.role)
        .sort(),
    ).toEqual([...ROLES].sort());
    expect(
      result.teamB.roleFit.assignments
        .map((assignment) => assignment.role)
        .sort(),
    ).toEqual([...ROLES].sort());

    expect(Number.isFinite(result.score.rankDifference)).toBe(true);
    expect(Number.isFinite(result.score.spreadPenalty)).toBe(true);
    expect(Number.isFinite(result.score.rolePenalty)).toBe(true);
    expect(Number.isFinite(result.score.total)).toBe(true);
  });

  it("separates the two strongest players in the real roster", () => {
    const result = balance(selectedPlayers);
    const teamAIds = new Set(result.teamA.players.map((player) => player.id));

    expect(teamAIds.has("an")).not.toBe(teamAIds.has("the-duy"));
  });

  it("returns the same result for the same input", () => {
    expect(balance(selectedPlayers)).toEqual(balance(selectedPlayers));
  });

  it("does not mutate the input roster", () => {
    const input: Player[] = structuredClone(selectedPlayers);
    const original = structuredClone(input);

    balance(input);

    expect(input).toEqual(original);
  });
});
