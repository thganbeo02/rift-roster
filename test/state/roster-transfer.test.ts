import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "@/state/roster";
import { exportRoster, importRoster } from "@/state/roster-transfer";

const player: RosterPlayer = {
  id: "stable-id",
  name: "Player",
  rank: 3,
  mainRole: "Mid",
  secondaryRoles: ["Top", "Jungle", "ADC", "Support"],
  wins: 0,
  games: 0,
  in: true,
  source: "manual",
};

describe("roster transfer", () => {
  it("exports formatted JSON and retains stable ids", () => {
    const exported = exportRoster([player]);

    expect(exported).toContain('\n  "players"');
    expect(JSON.parse(exported)).toEqual({ players: [player] });
  });

  it("imports current objects and legacy bare arrays", () => {
    expect(importRoster(exportRoster([player]))).toEqual({
      ok: true,
      players: [player],
    });
    expect(importRoster(JSON.stringify([player]))).toEqual({
      ok: true,
      players: [player],
    });
  });

  it("rejects invalid JSON and invalid top-level shapes", () => {
    expect(importRoster("not-json")).toEqual({
      ok: false,
      error: "The selected file is not valid JSON.",
    });
    expect(importRoster('{"players":"wrong"}').ok).toBe(false);
    expect(importRoster('{"players":[null]}').ok).toBe(false);
  });

  it("accepts an intentionally empty roster", () => {
    expect(importRoster('{"players":[]}')).toEqual({ ok: true, players: [] });
  });
});
