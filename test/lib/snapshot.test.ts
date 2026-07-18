import { describe, expect, it } from "vitest";

import { balance } from "@/engine";
import {
  parseSnapshot,
  serializeSnapshot,
  SNAPSHOT_LIMITS,
  type Snapshot,
} from "@/lib/snapshot";
import { playerPool } from "../fixtures/players";

function snapshot(): Snapshot {
  const result = balance(playerPool.slice(0, 10));
  if (!result) throw new Error("Expected the fixture roster to balance.");

  return serializeSnapshot({
    slug: "aB3_dE7-x",
    createdAt: 1_721_000_000_000,
    label: "Week of Jul 14",
    result,
    notes: ["Azure has one off-role assignment."],
  });
}

describe("snapshot serialization", () => {
  it("maps rendered teams, assigned roles, meter, and notes", () => {
    const value = snapshot();

    expect(value.teams.a).toHaveLength(5);
    expect(value.teams.b).toHaveLength(5);
    expect(value.teams.a[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        rank: expect.any(Number),
        role: expect.any(String),
        offRole: expect.any(Boolean),
      }),
    );
    expect(value.meter.verdict).toMatch(
      /Dead even|Slight edge|Clear favorite|Lopsided|Blowout/,
    );
    expect(value.meter.gap).toBeGreaterThanOrEqual(0);
    expect(value.notes).toEqual(["Azure has one off-role assignment."]);
  });

  it("does not expose raw stats, ids, preferences, or engine scores", () => {
    const json = JSON.stringify(snapshot());

    expect(json).not.toMatch(
      /"wins"|"games"|"id"|"preference"|"cost"|"effectiveScore"/,
    );
  });

  it("copies display notes instead of retaining the input array", () => {
    const result = balance(playerPool.slice(0, 10));
    if (!result) throw new Error("Expected the fixture roster to balance.");
    const notes = ["Original note"];

    const value = serializeSnapshot({
      slug: "abcdefgh",
      createdAt: 1,
      result,
      notes,
    });
    notes[0] = "Changed later";

    expect(value.notes).toEqual(["Original note"]);
  });
});

describe("snapshot validation", () => {
  it("accepts a valid serialized snapshot", () => {
    const value = snapshot();

    expect(parseSnapshot(value)).toEqual({ ok: true, snapshot: value });
  });

  it.each([
    ["missing player", (value: Snapshot) => value.teams.a.pop()],
    [
      "invalid rank",
      (value: Snapshot) => {
        value.teams.a[0].rank = 9 as never;
      },
    ],
    [
      "invalid role",
      (value: Snapshot) => {
        value.teams.a[0].role = "Coach" as never;
      },
    ],
    [
      "duplicate role",
      (value: Snapshot) => {
        value.teams.a[0].role = value.teams.a[1].role;
      },
    ],
    [
      "invalid slug",
      (value: Snapshot) => {
        value.slug = "bad slug";
      },
    ],
  ])("rejects %s", (_name, mutate) => {
    const value = snapshot();
    mutate(value);

    expect(parseSnapshot(value).ok).toBe(false);
  });

  it("rejects oversized labels, names, verdicts, and notes", () => {
    const fields: Array<(value: Snapshot) => void> = [
      (value) => {
        value.label = "x".repeat(SNAPSHOT_LIMITS.labelLength + 1);
      },
      (value) => {
        value.teams.a[0].name = "x".repeat(
          SNAPSHOT_LIMITS.playerNameLength + 1,
        );
      },
      (value) => {
        value.meter.verdict = "x".repeat(
          SNAPSHOT_LIMITS.verdictLength + 1,
        );
      },
      (value) => {
        value.notes = ["x".repeat(SNAPSHOT_LIMITS.noteLength + 1)];
      },
    ];

    for (const mutate of fields) {
      const value = snapshot();
      mutate(value);
      expect(parseSnapshot(value).ok).toBe(false);
    }
  });

  it("rejects extra fields so raw stats cannot cross the boundary", () => {
    const value = snapshot();
    const player = value.teams.a[0] as Snapshot["teams"]["a"][number] & {
      wins: number;
    };
    player.wins = 12;

    expect(parseSnapshot(value).ok).toBe(false);
  });
});
