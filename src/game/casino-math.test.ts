import { describe, expect, test } from "bun:test";
import { minesMultiplier, minesSurvival } from "./casino-math";

/**
 * Property under test: expected value of a cashout after k safe picks is
 * exactly the house edge (0.97) for every board and every cashout depth —
 * the game can never be gamed by stopping at a "lucky" depth.
 */
describe("mines multiplier — house edge invariance", () => {
  for (const mineCount of [3, 5, 7, 10]) {
    const tiles = 25;
    const safe = tiles - mineCount;

    test(`m=${mineCount}: EV(payout × survival) === 0.97 at every depth`, () => {
      let survival = 1;
      for (let k = 1; k <= Math.min(6, safe); k++) {
        survival *= (safe - k + 1) / (tiles - k + 1);
        const ev = minesMultiplier(k, mineCount, tiles) * survival;
        expect(ev).toBeCloseTo(0.97, 10);
      }
    });

    test(`m=${mineCount}: full-clear payout is finite and positive`, () => {
      const mult = minesMultiplier(safe, mineCount, tiles);
      expect(Number.isFinite(mult)).toBe(true);
      expect(mult).toBeGreaterThan(0);
    });
  }
});

describe("mines multiplier — regression against the old printer", () => {
  test("one safe tile on a 5-mine board no longer pays >1 EV", () => {
    // Old formula: 1 + (1/20) × 6 = 1.30 → EV 1.04 (a printer).
    const survival1 = minesSurvival(1, 5, 25); // 0.8
    expect(minesMultiplier(1, 5, 25) * survival1).toBeCloseTo(0.97, 10);
    expect(minesMultiplier(1, 5, 25)).toBeLessThan(1.3);
  });

  test("multiplier is strictly increasing in revealed count", () => {
    let prev = 0;
    for (let k = 1; k <= 20; k++) {
      const m = minesMultiplier(k, 5, 25);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });

  test("multiplier grows with mine count at fixed depth", () => {
    const k = 2;
    expect(minesMultiplier(k, 3, 25)).toBeLessThan(minesMultiplier(k, 5, 25));
    expect(minesMultiplier(k, 5, 25)).toBeLessThan(minesMultiplier(k, 7, 25));
    expect(minesMultiplier(k, 7, 25)).toBeLessThan(minesMultiplier(k, 10, 25));
  });

  test("survival probabilities are valid and complementary to the payout", () => {
    expect(minesSurvival(1, 5, 25)).toBeCloseTo(0.8, 10);
    expect(minesSurvival(0, 5, 25)).toBe(1);
    // Payout × survival ≈ EV must stay <= 1 everywhere (house always wins EV).
    for (let k = 1; k <= 20; k++) {
      expect(minesMultiplier(k, 5, 25) * minesSurvival(k, 5, 25)).toBeLessThanOrEqual(0.98);
    }
  });
});
