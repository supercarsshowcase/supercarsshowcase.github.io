import { describe, expect, test } from "bun:test";
import {
  clickValue,
  dailyReward,
  gameReducer,
  initialGameState,
  passivePerSec,
  upgradeCost,
} from "./engine";

const T0 = 1_700_000_000_000;

describe("daily reward", () => {
  test("cannot claim twice within 12 hours", () => {
    let s = initialGameState();
    s = { ...s, lastTick: T0 };
    const reward = dailyReward(s, T0);
    s = gameReducer(s, { type: "CLAIM_DAILY", reward, now: T0 });
    const cashAfterFirst = s.cash;
    expect(s.cash).toBe(120 + reward);
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
