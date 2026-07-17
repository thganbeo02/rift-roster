import type { BalanceResult } from "@/engine";

/**
 * Team-total advantage (in effective-score points) that maps to roughly a
 * 90% win probability. Calibrated by feel — there is no game-outcome data to
 * fit against yet — so it is intentionally a single, easily tunable knob.
 */
export const WIN_PROB_SCALE = 225;

export type FavoredTeam = "azure" | "crimson" | "even";

export interface BalanceMeter {
  /** Probability Team Azure (teamA) wins, 0..1. */
  winProbabilityAzure: number;
  /** Probability Team Crimson (teamB) wins, 0..1. */
  winProbabilityCrimson: number;
  /** Which side the model favors, or "even" on a true tie. */
  favored: FavoredTeam;
  /** 0..100. 100 = a perfect coin flip; 0 = a certain result. */
  balanceScore: number;
  /** Short human verdict derived from the balance score. */
  verdict: string;
}

function verdictFor(balanceScore: number): string {
  if (balanceScore >= 90) return "Dead even";
  if (balanceScore >= 75) return "Slight edge";
  if (balanceScore >= 55) return "Clear favorite";
  if (balanceScore >= 35) return "Lopsided";
  return "Blowout";
}

/**
 * Derive the human-facing readout from a balance result. Depends only on the
 * two teams' effective-score totals (the strength gap) — deliberately *not*
 * on role penalty or spread, which measure arrangement comfort rather than who
 * is likely to win, and are surfaced separately in the UI.
 */
export function balanceMeter(
  result: BalanceResult,
  scale: number = WIN_PROB_SCALE,
): BalanceMeter {
  const delta = result.teamA.effectiveScore - result.teamB.effectiveScore;

  const winProbabilityAzure = 1 / (1 + Math.exp(-delta / scale));
  const winProbabilityCrimson = 1 - winProbabilityAzure;

  const balanceScore =
    100 * (1 - Math.abs(winProbabilityAzure - winProbabilityCrimson));

  let favored: FavoredTeam = "even";
  if (Math.abs(delta) > 1e-9) {
    favored = delta > 0 ? "azure" : "crimson";
  }

  return {
    winProbabilityAzure,
    winProbabilityCrimson,
    favored,
    balanceScore,
    verdict: verdictFor(balanceScore),
  };
}
