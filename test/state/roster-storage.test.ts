import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "@/state/roster";
import {
  parseRoster,
  serializeRoster,
} from "@/state/roster-storage";

const player: RosterPlayer = {
  id: "manual-player",
  name: "Manual Player",
  rank: 4,
  peak: 5,
  mainRole: "Jungle",
  secondaryRoles: ["Mid", "Support"],
  wins: 12,
  games: 20,
  in: false,
  source: "manual",
};

describe("roster storage", () => {
  it("round-trips the complete organizer roster", () => {
    const generated: RosterPlayer = {
      ...player,
      id: "generated-player",
      source: "generated",
      in: true,
    };

    expect(parseRoster(serializeRoster([player, generated]))).toEqual([
      player,
      generated,
    ]);
  });

  it("accepts a legacy bare player array", () => {
    expect(parseRoster(JSON.stringify([player]))).toEqual([player]);
  });

  it("normalizes malformed player fields without crashing", () => {
    const stored = JSON.stringify({
      players: [
        {
          id: "player",
          name: "  Example  ",
          rank: 99,
          peak: -4,
          mainRole: "Invalid",
          secondaryRoles: ["Top", "Mid", "Mid", "Invalid"],
          wins: -3,
          games: 12.8,
          in: "yes",
          source: "unknown",
        },
      ],
    });

    expect(parseRoster(stored)).toEqual([
      {
        id: "player",
        name: "Example",
        rank: 5,
        peak: 0,
        mainRole: "Top",
        secondaryRoles: ["Mid"],
        wins: 0,
        games: 12,
        in: true,
        source: "manual",
      },
    ]);
  });

  it("repairs missing and duplicate ids deterministically", () => {
    const stored = JSON.stringify({
      players: [
        { ...player, id: "duplicate" },
        { ...player, id: "duplicate" },
        { ...player, id: "" },
      ],
    });

    expect(parseRoster(stored).map(({ id }) => id)).toEqual([
      "duplicate",
      "duplicate-2",
      "stored-player-3",
    ]);
  });

  it("returns an empty roster for missing or invalid JSON", () => {
    expect(parseRoster(null)).toEqual([]);
    expect(parseRoster("not-json")).toEqual([]);
    expect(parseRoster('{"players":"wrong"}')).toEqual([]);
  });
});
