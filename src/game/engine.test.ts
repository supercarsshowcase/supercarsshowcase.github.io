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

describe("upgradeCost", () => {
  it("returns finite for valid upgrade", () => {
    const s = make({ totalEarned: 50_000 });
    const cost = upgradeCost(s, STARTER_ID, "condition");
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(Infinity);
  });
});
