// Run with: node --test   (zero dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { RANKS, effScore, kCombos } from "../src/engine.mjs";

test("kCombos: 5-of-10 yields 252 combinations (126 unique splits)", () => {
  assert.equal(kCombos(10, 5).length, 252);
});

test("effScore: <5 games ignores win rate (pure rank score)", () => {
  const p = { rank: 2, wins: 4, games: 4 }; // Gold, tiny sample
  assert.equal(effScore(p), RANKS[2].score);
});

test("effScore: 5-game floor contributes zero adjustment", () => {
  const p = { rank: 2, wins: 5, games: 5 }; // 100% WR but conf=0 at 5 games
  assert.equal(effScore(p), RANKS[2].score);
});

test("effScore: at 20 games, WR reaches full +/-60 influence", () => {
  const hot  = effScore({ rank: 2, wins: 20, games: 20 }); // 100% WR
  const cold = effScore({ rank: 2, wins: 0,  games: 20 }); // 0% WR
  assert.equal(hot,  RANKS[2].score + 60);
  assert.equal(cold, RANKS[2].score - 60);
});

test("effScore: peak blends 70/30 with current rank", () => {
  // Gold (300) peaked Diamond+ (650) -> 0.7*300 + 0.3*650 = 405
  assert.equal(effScore({ rank: 2, peak: 5, games: 0 }), 405);
});

test("effScore: adjust applies a flat +/-100 per step, last", () => {
  assert.equal(effScore({ rank: 2, games: 0, adjust: 1 }), RANKS[2].score + 100);
});
