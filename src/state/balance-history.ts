import type { BalanceResult, Player } from "@/engine";

export const BALANCE_HISTORY_STORAGE_KEY = "rift-roster:balance-history";
export const MAX_RECENT_SPLITS = 8;
export const MAX_ALTERNATIVE_COST_DELTA = 100;

export type BalanceHistory = Record<string, string[]>;

export interface FreshBalanceSelection {
  result: BalanceResult;
  signature: string;
  optimalCost: number;
  eligibleCandidates: number;
  historyExhausted: boolean;
}

function offRoleCount(result: BalanceResult): number {
  return [...result.teamA.roleFit.assignments, ...result.teamB.roleFit.assignments]
    .filter((assignment) => assignment.preference === "off").length;
}

export function balanceCohortKey(players: readonly Player[]): string {
  return players.map((player) => player.id).sort().join("|");
}

export function splitSignature(result: BalanceResult): string {
  const teams = [result.teamA.players, result.teamB.players]
    .map((team) => team.map((player) => player.id).sort().join(","))
    .sort();

  return teams.join("|");
}

export function chooseFreshBalance(
  candidates: readonly BalanceResult[],
  recentSignatures: readonly string[],
  rng: () => number = Math.random,
): FreshBalanceSelection {
  if (candidates.length === 0) {
    throw new RangeError("chooseFreshBalance requires at least one candidate");
  }

  const optimal = candidates[0];
  const optimalOffRoles = offRoleCount(optimal);
  const eligible = candidates.filter(
    (candidate) =>
      candidate.score.total <=
        optimal.score.total + MAX_ALTERNATIVE_COST_DELTA &&
      offRoleCount(candidate) <= optimalOffRoles,
  );
  const recent = new Set(recentSignatures);
  const unused = eligible.filter(
    (candidate) => !recent.has(splitSignature(candidate)),
  );
  const pool = unused.length > 0 ? unused : eligible;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  const result = pool[Math.max(0, index)];

  return {
    result,
    signature: splitSignature(result),
    optimalCost: optimal.score.total,
    eligibleCandidates: eligible.length,
    historyExhausted: unused.length === 0 && recentSignatures.length > 0,
  };
}

export function addRecentSplit(
  history: BalanceHistory,
  cohortKey: string,
  signature: string,
): BalanceHistory {
  const recent = history[cohortKey] ?? [];

  return {
    ...history,
    [cohortKey]: [signature, ...recent.filter((item) => item !== signature)].slice(
      0,
      MAX_RECENT_SPLITS,
    ),
  };
}

export function parseBalanceHistory(value: string | null): BalanceHistory {
  if (!value) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const history: BalanceHistory = {};
  for (const [key, signatures] of Object.entries(parsed)) {
    if (!Array.isArray(signatures)) {
      continue;
    }

    history[key] = signatures
      .filter((signature): signature is string => typeof signature === "string")
      .slice(0, MAX_RECENT_SPLITS);
  }

  return history;
}

export function serializeBalanceHistory(history: BalanceHistory): string {
  return JSON.stringify(history);
}
