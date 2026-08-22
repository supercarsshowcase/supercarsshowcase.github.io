import { describe, expect, test } from "bun:test";
import {
  clickValue,
  dailyReward,
  gameReducer,
  initialGameState,
  passivePerSec,
  upgradeCost,
} from "./engine";
import { GAME_CAR_MAP, SECRET_CAR_ID } from "./data";
import type { GameState } from "./types";

const T0 = 1_700_000_000_000;

describe("daily reward", () => {
  test("cannot claim twice within 12 hours", () => {
    let s = initialGameState();
    s = { ...s, lastTick: T0 };
    const reward = dailyReward(s, T0);
    s = gameReducer(s, { type: "CLAIM_DAILY", reward, now: T0 });
    const cashAfterFirst = s.cash;
    expect(s.cash).toBe(reward); // starts at $0 now
    expect(s.daily.nextClaimAt).toBe(T0 + 12 * 3_600_000);
    // Immediate second claim is rejected.
    s = gameReducer(s, { type: "CLAIM_DAILY", reward, now: T0 + 5000 });
    expect(s.cash).toBe(cashAfterFirst);
  });

  test("can claim again after 12h and the streak grows", () => {
    let s = initialGameState();
    s = gameReducer({ ...s, lastTick: T0 }, { type: "CLAIM_DAILY", reward: 100, now: T0 });
    expect(s.daily.streak).toBe(1);
    const t1 = T0 + 12 * 3_600_000 + 1000;
    const reward2 = dailyReward({ ...s, lastTick: t1 }, t1);
    s = gameReducer({ ...s, lastTick: t1 }, { type: "CLAIM_DAILY", reward: reward2, now: t1 });
    expect(s.daily.streak).toBe(2);
    expect(s.daily.nextClaimAt).toBe(t1 + 12 * 3_600_000);
  });

  test("streak resets if a claim is skipped for over a day", () => {
    let s = initialGameState();
    s = gameReducer({ ...s, lastTick: T0 }, { type: "CLAIM_DAILY", reward: 100, now: T0 });
    expect(s.daily.streak).toBe(1);
    const t1 = T0 + 36 * 3_600_000; // 36h later
    const reward2 = dailyReward({ ...s, lastTick: t1 }, t1);
    s = gameReducer({ ...s, lastTick: t1 }, { type: "CLAIM_DAILY", reward: reward2, now: t1 });
    expect(s.daily.streak).toBe(1);
  });
});

describe("secret car is a display trophy", () => {
  test("owning the secret car adds no passive income", () => {
    const s = initialGameState();
    const before = passivePerSec(s);
    const withGhost: typeof s = {
      ...s,
      ownedCars: { ...s.ownedCars, [SECRET_CAR_ID]: { upgrades: {} } },
    };
    expect(passivePerSec(withGhost)).toBe(before);
  });

  test("driving the secret car yields no click earnings", () => {
    const s: GameState = {
      ...initialGameState(),
      activeCarId: SECRET_CAR_ID,
      ownedCars: { ...initialGameState().ownedCars, [SECRET_CAR_ID]: { upgrades: {} } },
    };
    expect(clickValue(s)).toBe(1); // floored, never $100K+
  });

  test("the secret car can never be sold", () => {
    const s: GameState = {
      ...initialGameState(),
      cash: 0,
      ownedCars: {
        ["rusty-hatch-91"]: { upgrades: {} },
        [SECRET_CAR_ID]: { upgrades: {} },
      },
    };
    const next = gameReducer(s, { type: "SELL_CAR", id: SECRET_CAR_ID });
    expect(next.ownedCars[SECRET_CAR_ID]).toBeDefined();
    expect(next.cash).toBe(0);
  });

  test("finding the secret car does not fire the Ultimate achievement", () => {
    expect(GAME_CAR_MAP[SECRET_CAR_ID].rarity).toBe("ultimate");
    const s: GameState = {
      ...initialGameState(),
      achievements: ["first-click", "first-car"], // pre-earned, so CLICK only scans rarity goals
      ownedCars: { ...initialGameState().ownedCars, [SECRET_CAR_ID]: { upgrades: {} } },
      reputation: 0,
    };
    // CLICK runs the achievement scan (applyAchievements) on the owned cars.
    const next = gameReducer(s, { type: "CLICK", amount: 1 });
    expect(next.achievements).not.toContain("ultimate-owner");
    expect(next.achievements).not.toContain("mythic-owner");
  });
});

describe("economy difficulty", () => {
  test("clicks are floored at $1 and passive income is a fraction of value", () => {
    const s = initialGameState();
    const click = clickValue(s);
    const passive = passivePerSec(s);
    expect(click).toBe(1); // the $1 floor keeps the rusty starter usable
    expect(passive).toBeLessThan(0.02); // starter: ~$0.0075/s
  });

  test("upgrade costs scale steeply with car value", () => {
    const s = { ...initialGameState(), activeCarId: "ferrari-458-12" };
    const cost = upgradeCost(s, "ferrari-458-12", "engine");
    // 458 Italia (720K) → first engine stage costs a meaningful 5-figure sum
    expect(cost).toBeGreaterThan(10_000);
    // maxing just the engine costs more than the car itself
    let total = 0;
    for (let i = 0; i < 7; i++) {
      s.ownedCars["ferrari-458-12"] = {
        upgrades: { engine: i },
      };
      total += upgradeCost(s, "ferrari-458-12", "engine");
    }
    expect(total).toBeGreaterThan(720_000);
  });
});
