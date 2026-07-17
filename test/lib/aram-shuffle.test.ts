import { describe, expect, it } from "vitest";

import { shuffleAramTeams } from "@/lib/aram-shuffle";
import { makePlayer } from "../fixtures/make-player";

const players = Array.from({ length: 10 }, (_, index) =>
  makePlayer(`p${index}`),
);

describe("shuffleAramTeams", () => {
  it("returns two complete teams without mutating the input", () => {
    const input = [...players];
    const result = shuffleAramTeams(input, () => 0);

    expect(result.teamA).toHaveLength(5);
    expect(result.teamB).toHaveLength(5);
    expect(new Set([...result.teamA, ...result.teamB].map(({ id }) => id)).size).toBe(
      10,
    );
    expect(input).toEqual(players);
  });

  it("is reproducible when an rng is injected", () => {
    expect(shuffleAramTeams(players, () => 0.42)).toEqual(
      shuffleAramTeams(players, () => 0.42),
    );
  });

  it("requires exactly ten players with unique ids", () => {
    expect(() => shuffleAramTeams(players.slice(0, 9))).toThrow(RangeError);
    expect(() => shuffleAramTeams([...players.slice(0, 9), players[0]])).toThrow(
      "ARAM shuffle requires every player to have a unique id",
    );
  });
});
