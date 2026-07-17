import { describe, expect, it } from "vitest";

import {
  buildScenario,
  SCENARIO_PRESETS,
} from "@/state/admin-scenarios";

function idFactory(): () => string {
  let nextId = 0;
  return () => `scenario-${(nextId += 1)}`;
}

describe("admin scenarios", () => {
  it.each(SCENARIO_PRESETS)("builds ten selected $name players", ({ id }) => {
    const players = buildScenario(id, idFactory());

    expect(players).toHaveLength(10);
    expect(new Set(players.map((player) => player.id)).size).toBe(10);
    expect(players.every((player) => player.in)).toBe(true);
    expect(players.every((player) => player.source === "generated")).toBe(true);
  });

  it("creates the intended outlier and role-stress scenarios", () => {
    const outliers = buildScenario("two-outliers", idFactory());
    const roleStress = buildScenario("same-main-role", idFactory());

    expect(outliers.filter((player) => player.rank === 5)).toHaveLength(2);
    expect(roleStress.every((player) => player.mainRole === "Mid")).toBe(true);
  });

  it("creates opposing form extremes and identical-score players", () => {
    const form = buildScenario("extreme-form", idFactory());
    const identical = buildScenario("identical-scores", idFactory());

    expect(form.map((player) => player.wins)).toEqual([
      20, 20, 20, 20, 20, 0, 0, 0, 0, 0,
    ]);
    expect(new Set(identical.map((player) => player.rank))).toEqual(new Set([2]));
    expect(new Set(identical.map((player) => player.mainRole))).toEqual(
      new Set(["Mid"]),
    );
  });
});
