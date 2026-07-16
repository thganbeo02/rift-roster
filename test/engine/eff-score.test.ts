import { describe, expect, it } from "vitest";

import { RANKS } from "@/engine/constants";
import { effScore } from "@/engine/eff-score";
import type { Player } from "@/engine/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "test-player",
    name: "Test Player",
    rank: 2,
    mainRole: "Mid",
    secondaryRoles: ["Top"],
    wins: 0,
    games: 0,
    ...overrides,
  };
}

describe("effScore", () => {
  it("ignores win rate below 5 games", () => {
    const player = makePlayer({
      rank: 2,
      wins: 4,
      games: 4,
    });

    expect(effScore(player)).toBe(RANKS[2].score);
  });

  it("applies zero win-rate adjustment at the 5-game floor", () => {
    const player = makePlayer({
      rank: 2,
      wins: 5,
      games: 5,
    });

    expect(effScore(player)).toBe(RANKS[2].score);
  });

  it("applies the full positive adjustment at 20 games", () => {
    const player = makePlayer({
      rank: 2,
      wins: 20,
      games: 20,
    });

    expect(effScore(player)).toBe(RANKS[2].score + 60);
  });

  it("applies the full negative adjustment at 20 games", () => {
    const player = makePlayer({
      rank: 2,
      wins: 0,
      games: 20,
    });

    expect(effScore(player)).toBe(RANKS[2].score - 60);
  });

  it("can disable win-rate adjustment", () => {
    const player = makePlayer({
      rank: 2,
      wins: 20,
      games: 20,
    });

    expect(
      effScore(player, {
        useWinRate: false,
      }),
    ).toBe(RANKS[2].score);
  });

  it("blends current and peak rank at 70/30", () => {
    const player = makePlayer({
      rank: 2,
      peak: 5,
    });

    expect(effScore(player)).toBe(405);
  });

  it("applies the manual adjustment last", () => {
    const player = makePlayer({
      rank: 2,
      adjust: 1,
    });

    expect(effScore(player)).toBe(RANKS[2].score + 100);
  });
});
