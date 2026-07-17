import { ROLES, type RankIndex, type Role } from "@/engine";
import type { RosterPlayer } from "@/state/roster";

export type ScenarioId =
  | "two-outliers"
  | "same-main-role"
  | "extreme-form"
  | "perfectly-even"
  | "identical-scores";

export const SCENARIO_PRESETS: ReadonlyArray<{
  id: ScenarioId;
  name: string;
  description: string;
}> = [
  {
    id: "two-outliers",
    name: "Two outliers",
    description: "Two Diamond+ carries surrounded by lower-ranked players.",
  },
  {
    id: "same-main-role",
    name: "Same main role",
    description: "Ten Mid mains force the role assignment penalty to work.",
  },
  {
    id: "extreme-form",
    name: "Extreme win rates",
    description: "Equal ranks split between perfect and zero win rates.",
  },
  {
    id: "perfectly-even",
    name: "Perfectly even",
    description: "Mirrored ranks and two players for every main role.",
  },
  {
    id: "identical-scores",
    name: "Identical players",
    description: "Ten equal-score players exercise deterministic tie handling.",
  },
];

type PlayerOverrides = Partial<
  Omit<RosterPlayer, "id" | "name" | "source" | "in">
>;

function scenarioPlayer(
  scenario: ScenarioId,
  index: number,
  createId: () => string,
  overrides: PlayerOverrides = {},
): RosterPlayer {
  const mainRole = ROLES[index % ROLES.length];
  const secondaryRole = ROLES[(index + 1) % ROLES.length];

  return {
    id: createId(),
    name: `${scenario.replaceAll("-", " ")} ${index + 1}`,
    rank: 2,
    mainRole,
    secondaryRoles: [secondaryRole],
    wins: 0,
    games: 0,
    in: true,
    source: "generated",
    ...overrides,
  };
}

export function buildScenario(
  scenario: ScenarioId,
  createId: () => string,
): RosterPlayer[] {
  return Array.from({ length: 10 }, (_, index) => {
    switch (scenario) {
      case "two-outliers":
        return scenarioPlayer(scenario, index, createId, {
          rank: (index < 2 ? 5 : 1) as RankIndex,
          mainRole: (index === 0 ? "Jungle" : index === 1 ? "Mid" : ROLES[index % 5]) as Role,
        });

      case "same-main-role":
        return scenarioPlayer(scenario, index, createId, {
          mainRole: "Mid",
          secondaryRoles: [
            ROLES.filter((role) => role !== "Mid")[index % (ROLES.length - 1)],
          ],
        });

      case "extreme-form":
        return scenarioPlayer(scenario, index, createId, {
          wins: index < 5 ? 20 : 0,
          games: 20,
        });

      case "perfectly-even":
        return scenarioPlayer(scenario, index, createId, {
          rank: Math.floor(index / 2) as RankIndex,
          mainRole: ROLES[index % ROLES.length],
        });

      case "identical-scores":
        return scenarioPlayer(scenario, index, createId, {
          rank: 2,
          mainRole: "Mid",
          secondaryRoles: ["Support"],
        });
    }
  });
}
