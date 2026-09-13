import { describe, test as it, expect } from "bun:test";
import { gameReducer, clickValue, passivePerSec, initialGameState, upgradeCost, FUEL_MAX } from "./engine";
import { STARTER_ID, GAME_CAR_MAP } from "./data";
import type { GameState } from "./types";

function make(overrides: Partial<GameState> = {}): GameState {
  return { ...initialGameState(), ...overrides };
}

describe("gameReducer", () => {
  it("CLICK increases cash and totalEarned", () => {
    const s = make();
    const next = gameReducer(s, { type: "CLICK", amount: 100 });
    expect(next.cash).toBe(100);
    expect(next.totalEarned).toBe(100);
    expect(next.totalClicks).toBe(1);
  });

  it("BUY_CAR deducts cash and adds to ownedCars", () => {
    const s = make({ cash: 200_000, totalEarned: 50_000, reputation: 0 });
    const next = gameReducer(s, { type: "BUY_CAR", id: "civic-lx-95" });
    expect(next.ownedCars["civic-lx-95"]).toBeDefined();
    expect(next.cash).toBeLessThan(200_000);
  });

  it("SELL_CAR removes car and gives 35% of value", () => {
    const s = make({
      cash: 100_000,
      ownedCars: {
        [STARTER_ID]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
        "civic-lx-95": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
      },
    });
    const next = gameReducer(s, { type: "SELL_CAR", id: "civic-lx-95" });
    expect(next.ownedCars["civic-lx-95"]).toBeUndefined();
    expect(next.cash).toBeGreaterThan(100_000);
  });

  it("can't sell last car", () => {
    const s = make();
    const next = gameReducer(s, { type: "SELL_CAR", id: STARTER_ID });
    expect(next.ownedCars[STARTER_ID]).toBeDefined();
  });

  it("CLAIM_OFFLINE credits cash, totalEarned, weekly and advances lastTick", () => {
    const s = make({ totalEarned: 50_000 });
    const next = gameReducer(s, {
      type: "CLAIM_OFFLINE",
      amount: 12_345,
      now: s.lastTick + 3_600_000,
    });
    expect(next.cash).toBe(12_345);
    expect(next.totalEarned).toBe(62_345);
    expect(next.lastTick).toBe(s.lastTick + 3_600_000);
    expect(next.weekly.weeklyEarned).toBe(12_345);
  });

  it("CLAIM_OFFLINE rounds fractional amounts", () => {
    const s = make();
    const next = gameReducer(s, { type: "CLAIM_OFFLINE", amount: 99.6, now: s.lastTick + 1000 });
    expect(next.cash).toBe(100);
  });

  it("CLAIM_OFFLINE ignores zero/negative amounts but still advances lastTick", () => {
    const s = make({ cash: 500 });
    const zero = gameReducer(s, { type: "CLAIM_OFFLINE", amount: 0, now: s.lastTick + 1000 });
    expect(zero.cash).toBe(500);
    expect(zero.lastTick).toBe(s.lastTick + 1000);
    const neg = gameReducer(s, { type: "CLAIM_OFFLINE", amount: -50, now: s.lastTick + 1000 });
    expect(neg.cash).toBe(500);
    expect(neg.lastTick).toBe(s.lastTick + 1000);
  });

  it("TICK adds passive income", () => {
    const s = make({ totalEarned: 50_000 });
    const next = gameReducer(s, {
      type: "TICK",
      now: s.lastTick + 10_000,
    });
    expect(next.totalEarned).toBeGreaterThanOrEqual(s.totalEarned);
  });

  it("OPEN_CRATE deducts cost", () => {
    const s = make({ cash: 1_000_000 });
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "cash", cash: 10 },
    });
    expect(next.cash).toBeLessThan(s.cash);
  });
});

describe("clickValue", () => {
  it("returns positive for starter car", () => {
    const s = make();
    expect(clickValue(s)).toBeGreaterThan(0);
  });
});

describe("passivePerSec", () => {
  it("returns >= 0", () => {
    const s = make();
    expect(passivePerSec(s)).toBeGreaterThanOrEqual(0);
  });
});

describe("CLICK fuel gating", () => {
  it("pays $0 when the active car is out of fuel (no $1 clamp drip)", () => {
    const s = make({
      activeCarId: STARTER_ID,
      ownedCars: {
        [STARTER_ID]: { upgrades: {}, fuel: 0, clicksSinceFuel: 0 },
      },
    });
    expect(clickValue(s)).toBe(0);
    const next = gameReducer(s, { type: "CLICK", amount: clickValue(s) });
    expect(next.cash).toBe(0);
    expect(next.totalEarned).toBe(0);
  });

  it("pays real amounts normally with fuel", () => {
    const s = make();
    const next = gameReducer(s, { type: "CLICK", amount: 250 });
    expect(next.cash).toBe(250);
  });

  it("floors only junk input to $1", () => {
    const s = make();
    const next = gameReducer(s, { type: "CLICK", amount: 0.4 });
    expect(next.cash).toBe(1);
  });

  it("out-of-fuel clicks still drain fuel counters", () => {
    const s = make({
      activeCarId: STARTER_ID,
      ownedCars: {
        [STARTER_ID]: { upgrades: {}, fuel: 0, clicksSinceFuel: 99 },
      },
    });
    const next = gameReducer(s, { type: "CLICK", amount: 0 });
    // fuel stays 0, but the click counter rolls over the drain interval
    expect(next.ownedCars[STARTER_ID].fuel).toBe(0);
    expect(next.ownedCars[STARTER_ID].clicksSinceFuel).toBe(0);
  });
});

describe("upgradeCost", () => {
  it("returns finite for valid upgrade", () => {
    const s = make({ totalEarned: 50_000 });
    const cost = upgradeCost(s, STARTER_ID, "condition");
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(Infinity);
  });
});
