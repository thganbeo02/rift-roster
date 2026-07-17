import { describe, expect, it } from "vitest";

import type { BalanceResult } from "@/engine";
import { balanceMeter, WIN_PROB_SCALE } from "@/lib/balance-meter";

// balanceMeter only reads the two effective-score totals, so a minimal stub is
// enough to exercise it without constructing a full balance result.
function stub(azureTotal: number, crimsonTotal: number): BalanceResult {
  return {
    teamA: { effectiveScore: azureTotal },
    teamB: { effectiveScore: crimsonTotal },
  } as unknown as BalanceResult;
}

describe("balanceMeter", () => {
  it("scores identical totals as a perfect coin flip", () => {
    const meter = balanceMeter(stub(1700, 1700));

    expect(meter.winProbabilityAzure).toBeCloseTo(0.5);
    expect(meter.winProbabilityCrimson).toBeCloseTo(0.5);
    expect(meter.balanceScore).toBeCloseTo(100);
    expect(meter.favored).toBe("even");
    expect(meter.verdict).toBe("Dead even");
  });

  it("always has the two win probabilities sum to 1", () => {
    const meter = balanceMeter(stub(1900, 1500));

    expect(meter.winProbabilityAzure + meter.winProbabilityCrimson).toBeCloseTo(
      1,
    );
  });

  it("favors the stronger team and lowers the balance score", () => {
    const meter = balanceMeter(stub(1900, 1500));

    expect(meter.favored).toBe("azure");
    expect(meter.winProbabilityAzure).toBeGreaterThan(0.5);
    expect(meter.balanceScore).toBeLessThan(100);
  });

  it("treats a full-scale gap as roughly a 90% favorite", () => {
    const meter = balanceMeter(stub(1700 + WIN_PROB_SCALE * 2.2, 1700));

    expect(meter.winProbabilityAzure).toBeGreaterThan(0.88);
    expect(meter.winProbabilityAzure).toBeLessThan(0.92);
  });

  it("is monotonic: a wider gap never raises the balance score", () => {
    const scores = [0, 100, 250, 500, 900].map(
      (gap) => balanceMeter(stub(1700 + gap, 1700)).balanceScore,
    );

    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("keeps the balance score consistent with the win-probability gap", () => {
    const meter = balanceMeter(stub(1850, 1600));
    const derived =
      100 *
      (1 -
        Math.abs(meter.winProbabilityAzure - meter.winProbabilityCrimson));

    expect(meter.balanceScore).toBeCloseTo(derived);
  });
});
