import { ROLE_COST } from "@/engine/constants";
import {
  ROLES,
  type Player,
  type Role,
  type RoleAssignment,
  type RoleFitResult,
  type RolePreference,
} from "@/engine/types";

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) {
    return [[]];
  }

  return values.flatMap((value, index) => {
    const remaining = [...values.slice(0, index), ...values.slice(index + 1)];

    return permutations(remaining).map((permutation) => [
      value,
      ...permutation,
    ]);
  });
}

const ROLE_PERMUTATIONS = permutations(ROLES);

function preferenceFor(player: Player, role: Role): RolePreference {
  if (player.mainRole === role) {
    return "main";
  }

  if (player.secondaryRoles.includes(role)) {
    return "secondary";
  }

  return "off";
}

export function roleFit(team: readonly Player[]): RoleFitResult {
  if (team.length !== ROLES.length) {
    throw new RangeError(`roleFit requires exactly ${ROLES.length} players`);
  }

  let best: RoleFitResult | undefined;

  for (const roles of ROLE_PERMUTATIONS) {
    const assignments: RoleAssignment[] = team.map((player, index) => {
      const role = roles[index];
      const preference = preferenceFor(player, role);

      return {
        player,
        role,
        preference,
        cost: ROLE_COST[preference],
      };
    });

    const penalty = assignments.reduce(
      (total, assignment) => total + assignment.cost,
      0,
    );

    if (best === undefined || penalty < best.penalty) {
      best = { penalty, assignments };
    }
  }

  if (best === undefined) {
    throw new Error("roleFit could not produce an assignment");
  }

  return best;
}
