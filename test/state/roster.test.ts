import { describe, expect, it } from "vitest";

import {
  rosterReducer,
  type RosterPlayer,
} from "@/state/roster";

function makeRosterPlayer(
  id: string,
  overrides: Partial<RosterPlayer> = {},
): RosterPlayer {
  return {
    id,
    name: id,
    rank: 2,
    mainRole: "Mid",
    secondaryRoles: [],
    wins: 0,
    games: 0,
    in: true,
    source: "manual",
    ...overrides,
  };
}

describe("rosterReducer", () => {
  it("replaces the complete roster without retaining the input array", () => {
    const replacement = [makeRosterPlayer("replacement")];

    const result = rosterReducer([makeRosterPlayer("old")], {
      type: "replace",
      players: replacement,
    });

    expect(result).toEqual(replacement);
    expect(result).not.toBe(replacement);
  });

  it("adds a player without mutating the existing roster", () => {
    const existing = makeRosterPlayer("existing");
    const roster = [existing];
    const added = makeRosterPlayer("added");

    const result = rosterReducer(roster, { type: "add", player: added });

    expect(result).toEqual([existing, added]);
    expect(result).not.toBe(roster);
    expect(roster).toEqual([existing]);
  });

  it("rejects a duplicate player id", () => {
    const roster = [makeRosterPlayer("duplicate")];

    expect(() =>
      rosterReducer(roster, {
        type: "add",
        player: makeRosterPlayer("duplicate"),
      }),
    ).toThrow('roster already contains player id "duplicate"');
  });

  it("adds multiple players atomically", () => {
    const existing = makeRosterPlayer("existing");
    const generated = [
      makeRosterPlayer("generated-1", { source: "generated" }),
      makeRosterPlayer("generated-2", { source: "generated" }),
    ];

    const result = rosterReducer([existing], {
      type: "add-many",
      players: generated,
    });

    expect(result).toEqual([existing, ...generated]);
  });

  it("rejects duplicate ids within a multi-player addition", () => {
    const duplicate = makeRosterPlayer("duplicate", { source: "generated" });

    expect(() =>
      rosterReducer([], {
        type: "add-many",
        players: [duplicate, { ...duplicate }],
      }),
    ).toThrow('roster already contains player id "duplicate"');
  });

  it("updates editable fields without changing the player id", () => {
    const original = makeRosterPlayer("one", { name: "Before" });
    const untouched = makeRosterPlayer("two");
    const roster = [original, untouched];

    const result = rosterReducer(roster, {
      type: "update",
      id: "one",
      changes: {
        name: "After",
        secondaryRoles: ["Top", "Support"],
        wins: 6,
        games: 10,
      },
    });

    expect(result[0]).toMatchObject({
      id: "one",
      name: "After",
      secondaryRoles: ["Top", "Support"],
      wins: 6,
      games: 10,
    });
    expect(result[0]).not.toBe(original);
    expect(result[1]).toBe(untouched);
    expect(original.name).toBe("Before");
  });

  it("removes a player by id", () => {
    const kept = makeRosterPlayer("kept");
    const removed = makeRosterPlayer("removed");

    const result = rosterReducer([kept, removed], {
      type: "remove",
      id: "removed",
    });

    expect(result).toEqual([kept]);
  });

  it("removes multiple players by id", () => {
    const kept = makeRosterPlayer("kept");
    const removedOne = makeRosterPlayer("removed-1", { source: "generated" });
    const removedTwo = makeRosterPlayer("removed-2", { source: "generated" });

    const result = rosterReducer([kept, removedOne, removedTwo], {
      type: "remove-many",
      ids: [removedOne.id, removedTwo.id],
    });

    expect(result).toEqual([kept]);
  });

  it("toggles availability without mutating the player", () => {
    const player = makeRosterPlayer("one", { in: true });

    const result = rosterReducer([player], {
      type: "toggle-availability",
      id: "one",
    });

    expect(result[0].in).toBe(false);
    expect(result[0]).not.toBe(player);
    expect(player.in).toBe(true);
  });

  it("sets availability to an exact group of player ids", () => {
    const one = makeRosterPlayer("one", { in: true });
    const two = makeRosterPlayer("two", { in: false });
    const three = makeRosterPlayer("three", { in: true });

    const result = rosterReducer([one, two, three], {
      type: "set-availability",
      ids: [two.id],
    });

    expect(result.map((player) => [player.id, player.in])).toEqual([
      ["one", false],
      ["two", true],
      ["three", false],
    ]);
    expect(one.in).toBe(true);
  });

  it("leaves player references unchanged when the id is absent", () => {
    const player = makeRosterPlayer("one");

    const result = rosterReducer([player], {
      type: "update",
      id: "missing",
      changes: { name: "No change" },
    });

    expect(result).toEqual([player]);
    expect(result[0]).toBe(player);
  });
});
