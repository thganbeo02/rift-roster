import { describe, expect, it } from "vitest";

import { roleFit } from "@/engine/role-fit";
import { ROLES, type Player } from "@/engine/types";
import { makePlayer } from "../fixtures/make-player";

describe("roleFit", () => {
  it("assigns five distinct main roles with no penalty", () => {
    const team = ROLES.map((role, index) =>
      makePlayer(`player-${index}`, {
        mainRole: role,
      }),
    );

    const result = roleFit(team);

    expect(result.penalty).toBe(0);
    expect(result.assignments.map(({ role }) => role)).toEqual(ROLES);
    expect(result.assignments.every(({ preference }) => preference === "main"))
      .toBe(true);
  });

  it("uses a secondary role when it is the cheapest complete assignment", () => {
    const team: Player[] = [
      makePlayer("flex", {
        mainRole: "ADC",
        secondaryRoles: ["Top"],
      }),
      makePlayer("jungler", { mainRole: "Jungle" }),
      makePlayer("mid", { mainRole: "Mid" }),
      makePlayer("adc", { mainRole: "ADC" }),
      makePlayer("support", { mainRole: "Support" }),
    ];

    const result = roleFit(team);
    const flexAssignment = result.assignments.find(
      ({ player }) => player.id === "flex",
    );

    expect(result.penalty).toBe(1);
    expect(flexAssignment).toMatchObject({
      role: "Top",
      preference: "secondary",
      cost: 1,
    });
  });

  it("uses an off-role assignment when no preferred option completes the team", () => {
    const team: Player[] = [
      makePlayer("off-role", { mainRole: "ADC" }),
      makePlayer("jungler", { mainRole: "Jungle" }),
      makePlayer("mid", { mainRole: "Mid" }),
      makePlayer("adc", { mainRole: "ADC" }),
      makePlayer("support", { mainRole: "Support" }),
    ];

    const result = roleFit(team);
    const offRoleAssignment = result.assignments.find(
      ({ player }) => player.id === "off-role",
    );

    expect(result.penalty).toBe(3);
    expect(offRoleAssignment).toMatchObject({
      role: "Top",
      preference: "off",
      cost: 3,
    });
  });

  it("breaks equal-cost assignment ties deterministically", () => {
    const team = Array.from({ length: 5 }, (_, index) =>
      makePlayer(`mid-${index}`),
    );

    expect(roleFit(team).assignments.map(({ role }) => role)).toEqual(ROLES);
  });

  it("rejects teams that do not contain exactly five players", () => {
    expect(() => roleFit([makePlayer("only-player")])).toThrow(RangeError);
  });
});
