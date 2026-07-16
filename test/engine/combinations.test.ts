import { describe, expect, it } from "vitest";

import { kCombos } from "@/engine/combinations";

describe("kCombos", () => {
  it("generates all 5-of-10 combinations", () => {
    expect(kCombos(10, 5)).toHaveLength(252);
  });

  it("leaves 126 unique mirrored splits when index 0 is required", () => {
    const uniqueSplits = kCombos(10, 5).filter((combo) => combo.includes(0));

    expect(uniqueSplits).toHaveLength(126);
  });

  it("returns one empty combination when choosing zero items", () => {
    expect(kCombos(5, 0)).toEqual([[]]);
  });

  it("returns no combinations when k is greater than n", () => {
    expect(kCombos(4, 5)).toEqual([]);
  });
});
