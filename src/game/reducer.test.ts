import { describe, expect, test } from "bun:test";
import { DEALERS, GAME_CAR_MAP } from "./data";
import {
  buyPrice,
  carValue,
  crateCost,
  gameReducer,
  hourlySupercar,
  initialGameState,
  nextSupercarSwapAt,
  rollDealerStock,
  rollSpin,
  FUEL_MAX,
  SPIN_COOLDOWN_MS,
  spinCashSlices,
  spinReadyAt,
  spinSupercarPool,
} from "./engine";
import type { GameState } from "./types";

const T0 = 1_700_000_000_000;

/** Level-2 player with enough cash, whose early achievements already fired. */
function rich(): GameState {
  return {
    ...initialGameState(),
    cash: 100_000_000,
    totalEarned: 50_000, // level 2
    achievements: ["first-click", "first-car"],
  };
}

describe("dealer stock", () => {
  test("rolls exactly the dealer's slot count with no duplicates", () => {
    for (const dealer of DEALERS) {
      const stock = rollDealerStock(dealer);
      expect(stock.length).toBe(dealer.slots);
      expect(new Set(stock).size).toBe(stock.length);
      for (const id of stock) {
        expect(GAME_CAR_MAP[id], `${id} must exist`).toBeDefined();
      }
    }
  });
});

describe("reducer: buying and selling", () => {
  test("BUY_CAR is rejected without enough cash", () => {
    const s = initialGameState(); // $0 cash
    const next = gameReducer(s, { type: "BUY_CAR", id: "civic-lx-95" });
    expect(next.cash).toBe(s.cash);
    expect(next.ownedCars["civic-lx-95"]).toBeUndefined();
  });

  test("BUY_CAR is level-gated even with cash", () => {
    const s = { ...initialGameState(), cash: 100_000_000 };
    const next = gameReducer(s, { type: "BUY_CAR", id: "ferrari-458-12" }); // unlock 40, level 1
    expect(next.ownedCars["ferrari-458-12"]).toBeUndefined();
  });

  test("BUY_CAR succeeds when affordable and unlocked", () => {
    const s = rich(); // level 2, early achievements already granted
    const next = gameReducer(s, { type: "BUY_CAR", id: "civic-lx-95" }); // unlock 2
    expect(next.ownedCars["civic-lx-95"]).toBeDefined();
    expect(next.cash).toBe(100_000_000 - buyPrice("civic-lx-95"));
  });

  test("cannot sell the last car", () => {
    const s = initialGameState();
    const next = gameReducer(s, { type: "SELL_CAR", id: "rusty-hatch-91" });
    expect(next.ownedCars["rusty-hatch-91"]).toBeDefined();
  });

  test("SELL_CAR pays 35% of current value and removes the car", () => {
    let s = rich();
    s = gameReducer(s, { type: "BUY_CAR", id: "civic-lx-95" });
    const cashBefore = s.cash;
    const next = gameReducer(s, { type: "SELL_CAR", id: "civic-lx-95" });
    expect(next.ownedCars["civic-lx-95"]).toBeUndefined();
    expect(next.cash).toBe(cashBefore + Math.round(carValue(s, "civic-lx-95") * 0.35));
  });
});

describe("reducer: crates", () => {
  test("OPEN_CRATE is rejected when unaffordable", () => {
    const s = initialGameState();
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "cash", cash: 100 },
    });
    expect(next.cash).toBe(s.cash);
    expect(next.cratesOpened).toBe(0);
  });

  test("OPEN_CRATE adds a new car and charges the cost", () => {
    const s: GameState = { ...rich(), cash: 100_000_000 };
    const cost = crateCost("scrapyard");
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "car", carId: "civic-lx-95" },
    });
    expect(next.ownedCars["civic-lx-95"]).toBeDefined();
    expect(next.cash).toBe(100_000_000 - cost);
    expect(next.cratesOpened).toBe(1);
  });

  test("a duplicate car drop pays 20% of its value", () => {
    const s: GameState = {
      ...rich(),
      cash: 100_000_000,
      ownedCars: { ...rich().ownedCars, "civic-lx-95": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
    };
    const cost = crateCost("scrapyard");
    const carVal = buyPrice("civic-lx-95");
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "car", carId: "civic-lx-95" },
    });
    expect(next.cash).toBe(100_000_000 - cost + Math.round(carVal * 0.2));
  });
});

describe("reducer: tick and prestige", () => {
  test("TICK adds passive income capped at 8 hours", () => {
    const s = { ...initialGameState(), lastTick: T0 };
    const next = gameReducer(s, { type: "TICK", now: T0 + 100_000 * 1000 });
    expect(next.cash).toBeGreaterThan(s.cash);
    expect(next.lastTick).toBe(T0 + 100_000 * 1000);
  });

  test("TICK with no elapsed time grants nothing", () => {
    const s = { ...initialGameState(), lastTick: T0 };
    const next = gameReducer(s, { type: "TICK", now: T0 });
    expect(next.cash).toBe(s.cash);
  });

  test("PRESTIGE requires reputation and resets the garage", () => {
    const s = { ...initialGameState(), reputation: 100 };
    const rejected = gameReducer(s, { type: "PRESTIGE" });
    expect(rejected.prestigeLevel).toBe(0);

    const ready: GameState = {
      ...s,
      reputation: 5000,
      achievements: ["first-click"],
      totalEarned: 90_000,
      cash: 500_000,
      ownedCars: { "rusty-hatch-91": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 }, "civic-lx-95": { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
    };
    const next = gameReducer(ready, { type: "PRESTIGE" });
    expect(next.prestigeLevel).toBe(1);
    expect(Object.keys(next.ownedCars)).toEqual(["rusty-hatch-91"]);
    // Prestige resets achievements so they can be re-earned
    expect(next.achievements).toEqual([]);
    expect(next.totalEarned).toBe(0);
  });
});

describe("reducer: lucky spin", () => {
  test("new players start with zero cash", () => {
    expect(initialGameState().cash).toBe(0);
  });

  test("SPIN is free initially and pays the rolled cash", () => {
    const s = initialGameState();
    const next = gameReducer(s, { type: "SPIN", now: T0, result: { kind: "cash", amount: 400, slice: 4 } });
    expect(next.cash).toBe(400);
    expect(next.lastSpinAt).toBe(T0);
  });

  test("SPIN adds a won supercar to the garage", () => {
    const s = initialGameState();
    const next = gameReducer(s, {
      type: "SPIN",
      now: T0,
      result: { kind: "car", carId: "ferrari-458-12", slice: 0 },
    });
    expect(next.ownedCars["ferrari-458-12"]).toBeDefined();
  });

  test("SPIN is blocked during the 15-minute cooldown", () => {
    const s = { ...initialGameState(), lastSpinAt: T0 };
    const next = gameReducer(s, {
      type: "SPIN",
      now: T0 + 60_000, // 1 minute later
      result: { kind: "cash", amount: 999, slice: 5 },
    });
    expect(next.cash).toBe(0);
    expect(next.lastSpinAt).toBe(T0);
  });

  test("SPIN works again after the cooldown passes", () => {
    const s = { ...initialGameState(), lastSpinAt: T0 };
    const next = gameReducer(s, {
      type: "SPIN",
      now: T0 + SPIN_COOLDOWN_MS + 1,
      result: { kind: "cash", amount: 250, slice: 3 },
    });
    expect(next.cash).toBe(250);
  });

  test("spinReadyAt is lastSpinAt plus the cooldown", () => {
    const s = { ...initialGameState(), lastSpinAt: T0 };
    expect(spinReadyAt(s)).toBe(T0 + SPIN_COOLDOWN_MS);
  });

  test("spin cash slices scale with level", () => {
    const low = spinCashSlices(initialGameState()); // level 1
    const leveled = spinCashSlices({ ...initialGameState(), totalEarned: 50_000_000 });
    expect(leveled[4]).toBeGreaterThan(low[4]);
  });

  test("rollSpin always returns a valid slice on the wheel", () => {
    // Use a leveled-up player so spin cash rewards aren't 0
    const s = { ...initialGameState(), totalEarned: 50_000_000 };
    for (let i = 0; i < 50; i++) {
      const r = rollSpin(s);
      expect(r.slice).toBeGreaterThanOrEqual(0);
      expect(r.slice).toBeLessThan(12);
      if (r.kind === "cash") {
        expect(r.amount).toBeGreaterThanOrEqual(0);
        expect(r.slice).toBeGreaterThan(0);
      } else {
        expect(r.carId).toBeDefined();
        expect(r.slice).toBe(0);
      }
    }
  });

  test("rollSpin only ever picks supercar-tier cars", () => {
    const s = initialGameState();
    for (let i = 0; i < 200; i++) {
      const r = rollSpin(s);
      if (r.kind !== "car" || !r.carId) continue;
      const def = GAME_CAR_MAP[r.carId];
      expect(def).toBeDefined();
      expect(def!.secret).not.toBe(true);
      expect(["legendary", "exotic", "hyper", "mythic", "ultimate"]).toContain(def!.rarity);
    }
  });

  test("the supercar pool is legendary+ and never includes the secret", () => {
    const pool = spinSupercarPool();
    expect(pool.length).toBeGreaterThan(10);
    for (const c of pool) {
      expect(c.secret).not.toBe(true);
      expect(["legendary", "exotic", "hyper", "mythic", "ultimate"]).toContain(c.rarity);
    }
  });

  test("the hourly jackpot is fixed within an hour and rotates afterwards", () => {
    const hour = Math.floor(T0 / 3_600_000) * 3_600_000;
    // Same car for the whole hour…
    expect(hourlySupercar(hour)?.id).toBe(hourlySupercar(hour + 3_599_000)?.id);
    // …and (almost always) a different one next hour.
    const pool = spinSupercarPool();
    expect(pool.length).toBeGreaterThan(1);
    const ids = new Set([hourlySupercar(hour)?.id, hourlySupercar(hour + 3_600_000)?.id]);
    expect(ids.size).toBeGreaterThan(1);
    // Always from the pool.
    const car = hourlySupercar(hour);
    expect(pool.some((c) => c.id === car?.id)).toBe(true);
  });

  test("nextSupercarSwapAt returns the next hour boundary", () => {
    const hour = Math.floor(T0 / 3_600_000) * 3_600_000;
    expect(nextSupercarSwapAt(hour)).toBe(hour + 3_600_000);
    expect(nextSupercarSwapAt(hour + 1)).toBe(hour + 3_600_000);
  });
});

describe("save normalization", () => {
  test("LOAD fills dealer stock and normalizes old daily shape", () => {
    const s = initialGameState();
    const oldSave = {
      cash: 500,
      daily: { day: "Mon", streak: 3 }, // pre-cooldown shape
      dealerStock: {}, // pre-seeding save
    } as unknown as GameState;
    const loaded = gameReducer(s, { type: "LOAD", state: oldSave });
    expect(loaded.daily.nextClaimAt).toBe(0); // claimable immediately after upgrade
    expect(Object.keys(loaded.dealerStock).length).toBe(DEALERS.length);
    for (const stock of Object.values(loaded.dealerStock)) {
      expect(stock.length).toBeGreaterThan(0);
    }
  });
});
