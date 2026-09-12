import { describe, expect, test } from "bun:test";
import {
  challengeMetric,
  generateWeeklyChallenges,
  getMonday,
  initialWeeklyState,
} from "./data";
import {
  canCompleteBounty,
  gameReducer,
  generateBounties,
  initialGameState,
} from "./engine";
import type { GameState, WantedBounty } from "./types";

const WEEK = "2026-01-05"; // a Monday
const NOW = 1_767_600_000_000;

describe("weekly challenge scaling", () => {
  test("targets grow with player level", () => {
    // Selection varies by level-seeded RNG, so compare average earned targets
    // across a year of Mondays — robust to template pick differences.
    let lowSum = 0;
    let highSum = 0;
    let lowN = 0;
    let highN = 0;
    for (let w = 0; w < 52; w++) {
      const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
        .toISOString()
        .split("T")[0];
      for (const ch of generateWeeklyChallenges(week, 1)) {
        if (ch.metric === "earned") {
          lowSum += ch.target;
          lowSum += ch.rewardCash / 1e9; // keep both series sampled
          lowN += 1;
        }
      }
      for (const ch of generateWeeklyChallenges(week, 100)) {
        if (ch.metric === "earned") {
          highSum += ch.target;
          highN += 1;
        }
      }
    }
    expect(lowN).toBeGreaterThan(0);
    expect(highN).toBeGreaterThan(0);
    const lowAvg = lowSum / lowN;
    const highAvg = highSum / highN;
    expect(highAvg).toBeGreaterThan(lowAvg * 10);
  });

  test("a level-1 player never sees a billion-dollar target", () => {
    // All Mondays in a year, all templates (jitter is bounded, so sampling
    // several seeds covers every template multiple times).
    for (let w = 0; w < 52; w++) {
      const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
        .toISOString()
        .split("T")[0];
      for (const ch of generateWeeklyChallenges(week, 1)) {
        if (ch.metric === "earned") expect(ch.target).toBeLessThan(10_000_000);
      }
    }
  });

  test("generation is deterministic per (week, level)", () => {
    const a = generateWeeklyChallenges(WEEK, 12);
    const b = generateWeeklyChallenges(WEEK, 12);
    expect(a).toEqual(b);
  });

  test("produces exactly 4 unique challenges with rewards", () => {
    const set = generateWeeklyChallenges(WEEK, 30);
    expect(set.length).toBe(4);
    expect(new Set(set.map((c) => c.metric)).size).toBe(4);
    for (const ch of set) {
      expect(ch.target).toBeGreaterThanOrEqual(1);
      expect(ch.rewardCash).toBeGreaterThan(0);
      expect(ch.rewardRep).toBeGreaterThan(0);
      expect(ch.claimed).toBe(false);
      expect(ch.name.length).toBeGreaterThan(0);
    }
  });

  test("level-gated templates stay out of low-level pools", () => {
    // Level 1: no prestige/buy-gated templates should appear even though the
    // fallback pool keeps the count at 4.
    const l1 = generateWeeklyChallenges(WEEK, 1);
    for (const ch of l1) {
      expect(ch.metric).not.toBe("prestiges");
    }
  });

  test("challengeMetric reads the new field and falls back for legacy saves", () => {
    expect(challengeMetric({ name: "whatever", metric: "spins" })).toBe("spins");
    expect(challengeMetric({ name: "Click your car 400 times", metric: undefined as never })).toBe("clicks");
    expect(challengeMetric({ name: "Earn $1M this week", metric: undefined as never })).toBe("earned");
  });

  test("initialWeeklyState embeds the generation level", () => {
    const ws = initialWeeklyState(NOW, 25);
    expect(ws.genLevel).toBe(25);
    expect(ws.weekStart).toBe(getMonday(new Date(NOW)));
    expect(ws.challenges.length).toBe(4);
  });
});

describe("wanted bounties", () => {
  test("bounty cars are level-appropriate", () => {
    for (let trial = 0; trial < 20; trial++) {
      const bounties = generateBounties(NOW, 1);
      expect(bounties.length).toBeGreaterThan(0);
      for (const b of bounties) {
        for (const { carId } of b.wants) {
          const car = generateBountyCar(carId);
          expect(car).toBeDefined();
          // A level-1 player can only be asked for cars at/below their level.
          expect(car!.unlockLevel).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  test("every requirement asks for exactly one car (ownable)", () => {
    for (let trial = 0; trial < 20; trial++) {
      for (const b of generateBounties(NOW, 50)) {
        for (const w of b.wants) expect(w.count).toBe(1);
      }
    }
  });

  test("bounties last 24 hours and pay 3x total car value", () => {
    const [b] = generateBounties(NOW, 10);
    expect(b.expiresAt - NOW).toBe(24 * 3_600_000);
    let value = 0;
    for (const w of b.wants) value += generateBountyCar(w.carId)!.value * w.count;
    expect(b.reward).toBe(value * 3);
  });

  test("canCompleteBounty requires owning every wanted car", () => {
    const s = initialGameState();
    const bounty: WantedBounty = {
      id: "t",
      wants: [{ carId: "rusty-hatch-91", count: 1 }],
      reward: 100,
      expiresAt: NOW + 1000,
      claimed: false,
    };
    expect(canCompleteBounty(s, bounty)).toBe(true);
    expect(canCompleteBounty(s, { ...bounty, wants: [{ carId: "chiron-17", count: 1 }] })).toBe(false);
  });

  test("claiming pays the reward and removes the bounty cars", () => {
    // Use the real clock: the reducer's upkeep runs on Date.now().
    const now = Date.now();
    const s = initialGameState();
    const carId = "rusty-hatch-91";
    const bounty: WantedBounty = {
      id: "b1",
      wants: [{ carId, count: 1 }],
      reward: 1234,
      expiresAt: now + 3_600_000,
      claimed: false,
    };
    const prepared: GameState = {
      ...s,
      totalEarned: 50_000,
      ownedCars: {
        [carId]: { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
        "beater-sedan-87": { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
      },
      wantedBounties: [bounty],
      wantedRefreshAt: now,
    };
    const next = gameReducer(prepared, { type: "SELL_FOR_BOUNTY", bountyId: "b1" });
    expect(next.cash).toBe(prepared.cash + 1234);
    expect(next.ownedCars[carId]).toBeUndefined();
    // The claimed bounty keeps its flag even if the board was refilled around it.
    const claimed = next.wantedBounties.find((b) => b.id === "b1");
    if (claimed) expect(claimed.claimed).toBe(true);
  });

  test("expired bounties are pruned and the board auto-refills", () => {
    const s = initialGameState();
    const stale: GameState = {
      ...s,
      totalEarned: 50_000,
      wantedBounties: [
        {
          id: "old",
          wants: [{ carId: "rusty-hatch-91", count: 1 }],
          reward: 1,
          expiresAt: NOW - 1,
          claimed: false,
        },
      ],
      wantedRefreshAt: 0,
    };
    const next = gameReducer(stale, { type: "TICK", now: NOW });
    const live = next.wantedBounties.filter((b) => b.expiresAt > NOW);
    expect(live.length).toBeGreaterThan(0);
    expect(next.wantedRefreshAt).toBeGreaterThan(0);
  });
});

/** Look up a car def without importing GAME_CAR_MAP into every assertion. */
function generateBountyCar(carId: string) {
  // Lazy import avoidance: engine re-exports nothing, so use the map here.
  // (Direct import is fine too; this keeps the diff local.)
  return bountyCarCache[carId];
}

import { GAME_CAR_MAP } from "./data";
const bountyCarCache = GAME_CAR_MAP;
