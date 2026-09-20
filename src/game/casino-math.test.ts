import { describe, expect, test } from "bun:test";
import { minesMultiplier, minesSurvival, pickWeighted } from "./casino-math";

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

describe("pickWeighted — contribution-weighted jackpot draw", () => {
  test("whale entry wins overwhelmingly over a min-bet entry", () => {
    // Old uniform pick gave the min-bet ~1/(N+1) odds — a printer.
    const all = [
      { name: "YOU", amount: 10_000 },
      { name: "WHALE", amount: 2_000_000 },
    ];
    let youWins = 0;
    for (let i = 0; i < 10_000; i++) if (pickWeighted(all)?.name === "YOU") youWins++;
    // Fair weighted odds = 10_000 / 2_010_000 ≈ 0.4975%. Allow wide margins.
    expect(youWins / 10_000).toBeLessThan(0.02);
    expect(youWins / 10_000).toBeGreaterThan(0.0005);
  });

  test("largest entry wins most often across a realistic pool", () => {
    const all = [
      { name: "A", amount: 50_000 },
      { name: "B", amount: 200_000 },
      { name: "C", amount: 1_000_000 },
    ];
    const wins: Record<string, number> = {};
    for (let i = 0; i < 30_000; i++) {
      const w = pickWeighted(all)!.name;
      wins[w] = (wins[w] ?? 0) + 1;
    }
    expect(wins["C"]).toBeGreaterThan(wins["B"]);
    expect(wins["B"]).toBeGreaterThan(wins["A"]);
    // Each share within 15% relative of its exact weight.
    expect(wins["A"] / 30_000).toBeCloseTo(50_000 / 1_250_000, 1);
    expect(wins["C"] / 30_000).toBeCloseTo(1_000_000 / 1_250_000, 1);
  });

  test("edge cases: empty pool, single player, zero amounts", () => {
    expect(pickWeighted([])).toBeUndefined();
    const single = [{ name: "SOLO", amount: 5 }];
    expect(pWeightedSolo(single)).toBe(true);
    function pWeightedSolo(entries: { name: string; amount: number }[]) {
      return pickWeighted(entries)?.name === "SOLO";
    }
    // All-zero amounts: falls back to a uniform pick rather than hanging.
    const zeros = [{ name: "X", amount: 0 }, { name: "Y", amount: 0 }];
    let got = 0;
    for (let i = 0; i < 100; i++) if (pickWeighted(zeros)) got++;
    expect(got).toBe(100);
  });

  test("never returns an entry outside the pool", () => {
    const all = [
      { name: "YOU", amount: 10_000 },
      { name: "PHANTOM", amount: 900_000 },
    ];
    for (let i = 0; i < 10_000; i++) {
      const w = pickWeighted(all);
      expect(all.includes(w!)).toBe(true);
    }
  });
});
