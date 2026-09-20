import { describe, expect, test } from "bun:test";
import type { GameState } from "./types";
import { Action, gameReducer, initialGameState, isSecretCar } from "./engine";
import { SECRET_CAR_ID, SECRET_CAR_CLICKS, STARTER_ID } from "./data";

function clicks(n: number): GameState {
  let s = initialGameState();
  for (let i = 0; i < n; i++) s = gameReducer(s, { type: "CLICK", amount: 1, globalMultiplier: 1 });
  return s;
}

describe("secret car — exclusive click milestone", () => {
  test("grants exactly at 300 starter clicks, not before", () => {
    const before = clicks(SECRET_CAR_CLICKS - 1);
    expect(before.ownedCars[SECRET_CAR_ID]).toBeUndefined();
    const at = clicks(SECRET_CAR_CLICKS);
    expect(at.ownedCars[SECRET_CAR_ID]).toBeDefined();
  });

  test("grants only while the starter is ACTIVE — other cars never count", () => {
    // A rich save owning another car + still on the starter click counter:
    // non-starter clicks must never advance clicksOnStarter or grant the ghost.
    let s = clicks(299);
    s = gameReducer(s, { type: "ADD_CASH", amount: 10_000_000 });
    s = gameReducer(s, { type: "BUY_CAR", id: "m4-18" });
    expect(s.ownedCars["m4-18"]).toBeDefined();
    s = gameReducer(s, { type: "SET_ACTIVE", id: "m4-18" });
    expect(s.activeCarId).toBe("m4-18");
    // Clicking with the M4 active — wasStarter is false, so the starter
    // counter must not advance and the ghost must stay locked.
    for (let i = 0; i < 5; i++) s = gameReducer(s, { type: "CLICK", amount: 500, globalMultiplier: 1 });
    expect(s.clicksOnStarter).toBe(299);
    expect(s.ownedCars[SECRET_CAR_ID]).toBeUndefined();
  });

  test("BUY_CAR refuses the secret car even with infinite cash", () => {
    let s = initialGameState();
    s = gameReducer(s, { type: "ADD_CASH", amount: 999_999_999_999 });
    const before = s;
    s = gameReducer(s, { type: "BUY_CAR", id: SECRET_CAR_ID });
    expect(s.ownedCars[SECRET_CAR_ID]).toBeUndefined();
    expect(s.cash).toBe(before.cash); // no purchase, no refund weirdness
  });

  test("ADD_CAR refuses the secret car (only the CLICK milestone grants it)", () => {
    let s = initialGameState();
    s = gameReducer(s, { type: "ADD_CAR", carId: SECRET_CAR_ID });
    expect(s.ownedCars[SECRET_CAR_ID]).toBeUndefined();
  });

  test("REMOVE_CAR and SELL_CAR refuse the secret car (trophy can't be lost)", () => {
    let s = clicks(SECRET_CAR_CLICKS);
    s = gameReducer(s, { type: "ADD_CASH", amount: 10_000_000 });
    s = gameReducer(s, { type: "BUY_CAR", id: "m4-18" });
    s = gameReducer(s, { type: "REMOVE_CAR", carId: SECRET_CAR_ID });
    expect(s.ownedCars[SECRET_CAR_ID]).toBeDefined();
    s = gameReducer(s, { type: "SELL_CAR", id: SECRET_CAR_ID });
    expect(s.ownedCars[SECRET_CAR_ID]).toBeDefined();
  });

  test("isSecretCar helper", () => {
    expect(isSecretCar(SECRET_CAR_ID)).toBe(true);
    expect(isSecretCar(STARTER_ID)).toBe(false);
  });
});
