import { describe, expect, test } from "bun:test";
import { DEALERS, GAME_CAR_MAP } from "./data";
import {
  carValue,
  gameReducer,
  initialGameState,
  rollDealerStock,
} from "./engine";
import type { GameState } from "./types";

const T0 = 1_700_000_000_000;

/** Level-2 player with enough cash, whose early achievements already fired. */
function rich(): GameState {
  return {
    ...initialGameState(),
    cash: 100_000,
    totalEarned: 500, // level 2
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
    const s = initialGameState(); // $120 cash
    const next = gameReducer(s, { type: "BUY_CAR", id: "civic-lx-95" }); // $2,600
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
    expect(next.cash).toBe(100_000 - 2_600);
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
    // condition 0 → value = 2600 * 0.45 = 1170 → 35% = 410
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
    const s: GameState = { ...rich(), cash: 1_000_000 };
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "car", carId: "civic-lx-95" },
    });
    expect(next.ownedCars["civic-lx-95"]).toBeDefined();
    expect(next.cash).toBe(1_000_000 - 250);
    expect(next.cratesOpened).toBe(1);
  });

  test("a duplicate car drop pays 30% of its value", () => {
    const s: GameState = {
      ...rich(),
      cash: 1_000_000,
      ownedCars: { ...rich().ownedCars, "civic-lx-95": { upgrades: {} } },
    };
    const next = gameReducer(s, {
      type: "OPEN_CRATE",
      crateId: "scrapyard",
      result: { kind: "car", carId: "civic-lx-95" },
    });
    expect(next.cash).toBe(1_000_000 - 250 + Math.round(2_600 * 0.3));
  });
});

describe("reducer: tick and prestige", () => {
  test("TICK adds passive income capped at 8 hours", () => {
    const s = { ...initialGameState(), lastTick: T0 };
    const next = gameReducer(s, { type: "TICK", now: T0 + 100_000 * 1000 });
    // starter passive = 500 * 0.00003 * 0.5 = 0.0075/s → 0.0075 * 28800 ≈ 216
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
      ownedCars: { "rusty-hatch-91": { upgrades: {} }, "civic-lx-95": { upgrades: {} } },
    };
    const next = gameReducer(ready, { type: "PRESTIGE" });
    expect(next.prestigeLevel).toBe(1);
    expect(Object.keys(next.ownedCars)).toEqual(["rusty-hatch-91"]);
    expect(next.achievements).toContain("first-click");
    expect(next.totalEarned).toBe(90_000);
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
