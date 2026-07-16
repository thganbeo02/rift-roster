import { describe, expect, it } from "vitest";

import { spreadPenalty } from "@/engine/spread-penalty";

describe("spreadPenalty", () => {
  it("returns zero for teams with the same score shape", () => {
    expect(
      spreadPenalty(
        [100, 200, 300, 400, 500],
        [100, 200, 300, 400, 500],
      ),
    ).toBe(0);
  });

  it("penalizes different internal spread", () => {
    const penalty = spreadPenalty(
      [100, 100, 100, 100, 100],
      [0, 0, 0, 0, 100],
    );

    expect(penalty).toBeCloseTo(24);
  });

  it("penalizes the strongest-player gap", () => {
    const penalty = spreadPenalty(
      [100, 100, 100, 100, 100],
      [200, 200, 200, 200, 200],
    );

    expect(penalty).toBe(50);
  });

  it("rejects an empty team", () => {
    expect(() => spreadPenalty([], [100])).toThrow(RangeError);
  });
});
