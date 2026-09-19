import { describe, test as it, expect } from "bun:test";
import { gameReducer, clickValue, passivePerSec, initialGameState, upgradeCost, carIncomePerSec, fuelCost, spinCashSlices, buyPrice, carValue, FUEL_MAX, FUEL_COST } from "./engine";
import { STARTER_ID, GAME_CAR_MAP, levelFrom } from "./data";
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
    const s = make({ cash: 200_000, totalEarned: 120_000, reputation: 0 }); // level 2
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

describe("fuelCost level scaling", () => {
  it("costs the FUEL_COST floor at level 1 and scales with level at higher levels", () => {
    const mk = (totalEarned: number, fuel = 0) => {
      const s = initialGameState();
      s.ownedCars[STARTER_ID] = { upgrades: {}, fuel, clicksSinceFuel: 0 };
      s.totalEarned = totalEarned; // levelFrom is driven by totalEarned
      return s;
    };
    // Level 1: questUnit(1)=3400 → 3400*0.06=204 → floor max(200,204)=204.
    const lvl1 = mk(0);
    expect(levelFrom(lvl1)).toBe(1);
    expect(fuelCost(lvl1, STARTER_ID)).toBe(Math.max(FUEL_COST, Math.round(3400 * 0.06)));
    // Level 3 needs totalEarned = 4×50K = 200K (levelFrom = 1+floor(√(e/50K))):
    // questUnit(3)=30,600 → 6% = $1,836. Level 3 needs 4×5K = 20K earned.
    const lvl3 = mk(20_000);
    expect(levelFrom(lvl3)).toBe(3);
    expect(fuelCost(lvl3, STARTER_ID)).toBe(Math.round(3_400 * 9 * 0.06));
    // Empty tank → partial costs proportional to missing fuel.
    const half = mk(20_000, FUEL_MAX / 2);
    expect(fuelCost(half, STARTER_ID)).toBe(Math.round(3_400 * 9 * 0.06 * 0.5));
    // Full tank → $0; not owned → $0.
    const full = mk(20_000, FUEL_MAX);
    expect(fuelCost(full, STARTER_ID)).toBe(0);
    expect(fuelCost(mk(20_000), "not-a-car")).toBe(0);
  });

  it("BUY_FUEL charges the level-scaled price and fills the tank", () => {
    const s = initialGameState();
    s.ownedCars[STARTER_ID] = { upgrades: {}, fuel: 0, clicksSinceFuel: 0 };
    s.totalEarned = 20_000; // level 3
    s.cash = 10_000;
    const expected = fuelCost(s, STARTER_ID);
    const next = gameReducer(s, { type: "BUY_FUEL", carId: STARTER_ID });
    expect(next.cash).toBe(10_000 - expected);
    expect(next.ownedCars[STARTER_ID].fuel).toBe(FUEL_MAX);
    // Idempotent at full tank.
    const again = gameReducer(next, { type: "BUY_FUEL", carId: STARTER_ID });
    expect(again.cash).toBe(next.cash);
  });

  it("BUY_FUEL is rejected when cash is short — no partial fill", () => {
    const s = initialGameState();
    s.ownedCars[STARTER_ID] = { upgrades: {}, fuel: 0, clicksSinceFuel: 0 };
    s.totalEarned = 20_000; // level 3 → $1,836 refuel
    s.cash = 10; // far short of the price
    const next = gameReducer(s, { type: "BUY_FUEL", carId: STARTER_ID });
    expect(next.cash).toBe(10);
    expect(next.ownedCars[STARTER_ID].fuel).toBe(0);
  });

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

describe("car income balance", () => {
  it("every owned car pays $/sec proportional to its value", () => {
    // THE reported bug: cars generated $0/sec. Every non-secret car must
    // generate income, and pricier cars must pay strictly more.
    const owned = {
      "rusty-hatch-91": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
      "civic-lx-95": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
      "ferrari-458-12": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
      "chiron-17": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
    };
    const s = make({ ownedCars: owned, totalEarned: 500_000_000 });
    const starter = carIncomePerSec(s, "rusty-hatch-91");
    expect(starter).toBeGreaterThan(0);
    expect(carIncomePerSec(s, "civic-lx-95")).toBeGreaterThan(starter);
    expect(carIncomePerSec(s, "ferrari-458-12")).toBeGreaterThan(carIncomePerSec(s, "civic-lx-95"));
    expect(carIncomePerSec(s, "chiron-17")).toBeGreaterThan(carIncomePerSec(s, "ferrari-458-12"));
    // Income scales linearly with value (same rate for every car).
    const ratio = carIncomePerSec(s, "chiron-17") / starter;
    const valueRatio = GAME_CAR_MAP["chiron-17"].value / GAME_CAR_MAP["rusty-hatch-91"].value;
    expect(Math.abs(ratio - valueRatio)).toBeLessThan(valueRatio * 0.01);
  });

  it("pays back a level-appropriate car in a sensible span, not minutes", () => {
    // A level-10 car (supra-mk3-88) must repay itself in real time — the
    // harder balance targets ~28h at half condition (14h restored): the core
    // buy → earn → buy-bigger loop stays a genuine progression decision.
    const car = GAME_CAR_MAP["supra-mk3-88"];
    const s = make({ ownedCars: { "supra-mk3-88": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } } });
    const paybackHours = car.value / carIncomePerSec(s, "supra-mk3-88") / 3600;
    expect(paybackHours).toBeGreaterThan(4); // not instant — a real purchase decision
    expect(paybackHours).toBeLessThan(48);
  });

  it("secret cars still earn nothing", () => {
    const s = make({ ownedCars: { "ghost-prototype": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } } });
    expect(carIncomePerSec(s, "ghost-prototype")).toBe(0);
  });

  it("an empty tank stops that car's income", () => {
    const s = make({
      ownedCars: { "rusty-hatch-91": { upgrades: {}, fuel: 0, clicksSinceFuel: 0 } },
    });
    expect(carIncomePerSec(s, "rusty-hatch-91")).toBe(0);
  });

  it("clicks pay more in better cars", () => {
    const starter = make();
    const rich = make({
      totalEarned: 500_000_000,
      ownedCars: { "chiron-17": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
      activeCarId: "chiron-17",
    });
    expect(clickValue(rich)).toBeGreaterThan(clickValue(starter) * 100);
  });
});

describe("hard balance invariants", () => {
  it("the spin wheel stays a snack, never an income strategy", () => {
    // Free spin every 30 min must pay far less than 30 min of car income,
    // so idling/spamming the wheel can't out-earn owning cars.
    const s = make({ totalEarned: 5_000 * 100 }); // level 11
    const avgSpin = spinCashSlices(s).reduce((a, b) => a + b, 0) / 9;
    const income30min = passivePerSec(s) * 1800;
    expect(avgSpin).toBeGreaterThan(0);
    // One free spin pays less than half an hour of just *idling* the garage —
    // so spinning can supplement, but never replace, owning cars.
    expect(avgSpin).toBeLessThan(income30min);
  });

  it("selling a car never returns more than half its purchase price", () => {
    const s = make({
      cash: 0,
      ownedCars: {
        [STARTER_ID]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
        "civic-lx-95": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 },
      },
    });
    const before = s.cash;
    const next = gameReducer(s, { type: "SELL_CAR", id: "civic-lx-95" });
    const gained = next.cash - before;
    expect(gained).toBe(Math.round(carValue(s, "civic-lx-95") * 0.3));
    expect(gained).toBeLessThan(buyPrice("civic-lx-95") * 0.5); // no buy→sell arbitrage
  });

  it("levels start fast and steepen: 2@5K, 3@20K, 10@405K", () => {
    expect(levelFrom({ totalEarned: 4_999, prestigeLevel: 0 })).toBe(1);
    expect(levelFrom({ totalEarned: 5_000, prestigeLevel: 0 })).toBe(2);
    expect(levelFrom({ totalEarned: 19_999, prestigeLevel: 0 })).toBe(2);
    expect(levelFrom({ totalEarned: 20_000, prestigeLevel: 0 })).toBe(3);
    expect(levelFrom({ totalEarned: 405_000, prestigeLevel: 0 })).toBe(10);
  });

  it("prestige reputation cost is 8000 × (level + 1)", () => {
    // First prestige: reachable, but a real goal (was 5000).
    const s = make({ reputation: 7_999 });
    const rejected = gameReducer(s, { type: "PRESTIGE" });
    expect(rejected.prestigeLevel).toBe(0);
    const ready = gameReducer(make({ reputation: 8_000 }), { type: "PRESTIGE" });
    expect(ready.prestigeLevel).toBe(1);
  });
});

describe("economy migration v1 → v2", () => {
  it("a pre-rebalance save regenerates its quest board and keeps cash/cars", () => {
    // The old board carried lvl² rewards like "$498K for 389 clicks".
    const oldSave = {
      ...initialGameState(),
      version: 1,
      cash: 12_345,
      totalEarned: 20_000, // level 3 (√(20K/5K)+1)
      weekly: {
        weekStart: "2001-01-01",
        genLevel: 3,
        weeklyEarned: 0,
        weeklyClicks: 0,
        weeklyCarsBought: 0,
        weeklyCratesOpened: 0,
        weeklySpins: 0,
        weeklyPrestiges: 0,
        challenges: [
          {
            id: "weekly-2001-0",
            name: "Click your car 389 times",
            desc: "x",
            metric: "clicks" as const,
            target: 389,
            progress: 389,
            rewardCash: 498_000, // the bug
            rewardRep: 55,
            claimed: false,
          },
        ],
      },
    };
    const loaded = gameReducer(initialGameState(), { type: "LOAD", state: oldSave });
    expect(loaded.cash).toBe(12_345); // money kept
    expect(loaded.version).toBe(2);
    expect(loaded.weekly.weekStart).not.toBe("2001-01-01"); // board regenerated
    for (const ch of loaded.weekly.challenges) {
      expect(ch.rewardCash, `${ch.name}`).toBeLessThan(50_000);
      expect(ch.claimed).toBe(false); // old overpaid claims are not preserved
    }
  });

  it("a current save loads untouched", () => {
    const current = { ...initialGameState(), version: 2, cash: 999 };
    const loaded = gameReducer(initialGameState(), { type: "LOAD", state: current });
    expect(loaded.cash).toBe(999);
    expect(loaded.weekly).toEqual(initialGameState().weekly);
  });
});
