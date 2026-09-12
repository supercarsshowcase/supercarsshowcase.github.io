import { describe, expect, test } from "bun:test";
import {
  GAME_CAR_MAP,
  STARTER_ID,
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
  wantedRefreshCost,
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

  test("earn targets are a reachable week of play (~1–8x weekly income)", () => {
    // Weekly income ≈ totalEarned × 4%, totalEarned ≈ 50K × (lvl−1)².
    for (const lvl of [10, 50, 100]) {
      let sum = 0;
      let n = 0;
      for (let w = 0; w < 52; w++) {
        const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
          .toISOString()
          .split("T")[0];
        for (const ch of generateWeeklyChallenges(week, lvl)) {
          if (ch.metric === "earned") {
            sum += ch.target;
            n += 1;
          }
        }
      }
      const avg = sum / n;
      const weeklyIncome = 50_000 * (lvl - 1) * (lvl - 1) * 0.04;
      const ratio = avg / weeklyIncome;
      expect(ratio, `level ${lvl} ratio ${ratio.toFixed(1)} must be playable`).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(20);
    }
  });

  test("rewards stay proportional to targets at high levels (no runaway)", () => {
    // A full board is a big bonus but stays within a sane multiple of weekly
    // income — completing challenges pays, but playing the game pays more.
    let sum = 0;
    for (let w = 0; w < 52; w++) {
      const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
        .toISOString()
        .split("T")[0];
      for (const ch of generateWeeklyChallenges(week, 200)) sum += ch.rewardCash;
    }
    const avgBoard = sum / 52;
    const weeklyIncome = 50_000 * 199 * 199 * 0.04;
    expect(avgBoard).toBeGreaterThan(weeklyIncome * 5); // generous, per request
    expect(avgBoard).toBeLessThan(weeklyIncome * 200); // still level-bounded
  });

  test("board reroll costs the greater of a 5% cash slice and a level floor", () => {
    const broke = { ...initialGameState(), cash: 1_000, totalEarned: 0 }; // level 1
    expect(wantedRefreshCost(broke)).toBe(250); // floor at level 1
    const mid = { ...initialGameState(), cash: 1_000_000, totalEarned: 5_000_000 }; // level ~11
    expect(wantedRefreshCost(mid)).toBe(50_000); // 5% slice
    const whale = { ...initialGameState(), cash: 10_000_000_000, totalEarned: 4_900_000_000 }; // level ~100
    expect(wantedRefreshCost(whale)).toBe(500_000_000); // 5% of wealth
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

  test("mega-level saves get capped, completable targets (the 447B-level bug)", () => {
    // Regression: an absurd save level used to draw "spin 5,113,616,471 times".
    for (let w = 0; w < 52; w++) {
      const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
        .toISOString()
        .split("T")[0];
      for (const ch of generateWeeklyChallenges(week, 447_213_595)) {
        if (ch.metric === "spins") expect(ch.target).toBeLessThanOrEqual(15);
        if (ch.metric === "cratesOpened") expect(ch.target).toBeLessThanOrEqual(10);
        if (ch.metric === "carsBought") expect(ch.target).toBeLessThanOrEqual(5);
        if (ch.metric === "clicks") expect(ch.target).toBeLessThanOrEqual(800);
        if (ch.metric === "earned") expect(ch.target).toBeLessThanOrEqual(1.5e9);
      }
    }
  });

  test("spins target is bounded even with jitter (wheel is free every 15 min)", () => {
    // The 15-spin cap must hold AFTER the ±20% jitter, not just before.
    for (let lvl = 1; lvl <= 2000; lvl += 7) {
      for (let w = 0; w < 8; w++) {
        const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
          .toISOString()
          .split("T")[0];
        for (const ch of generateWeeklyChallenges(week, lvl)) {
          if (ch.metric === "spins") expect(ch.target).toBeLessThanOrEqual(15);
        }
      }
    }
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

  test("bounties last 24 hours and pay 5x total car value", () => {
    const [b] = generateBounties(NOW, 10);
    expect(b.expiresAt - NOW).toBe(24 * 3_600_000);
    let value = 0;
    for (const w of b.wants) value += generateBountyCar(w.carId)!.value * w.count;
    expect(b.reward).toBe(value * 5);
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

  test("a full board is never churned (expiry labels stay honest)", () => {
    const now = Date.now();
    const bounties: WantedBounty[] = [0, 1, 2].map((i) => ({
      id: `live-${i}`,
      wants: [{ carId: "rusty-hatch-91", count: 1 }],
      reward: 100,
      expiresAt: now + 23 * 3_600_000,
      claimed: false,
    }));
    const s: GameState = {
      ...initialGameState(),
      totalEarned: 50_000,
      wantedBounties: bounties,
      wantedRefreshAt: now,
    };
    const next = gameReducer(s, { type: "CLICK", amount: 1 });
    expect(next.wantedBounties.map((b) => b.id)).toEqual(["live-0", "live-1", "live-2"]);
  });

  test("casino one-off cars never appear as bounty targets", () => {
    const vaultCarIds = new Set(
      Object.values(GAME_CAR_MAP)
        .filter((c) => c.dealer === "vault")
        .map((c) => c.id),
    );
    expect(vaultCarIds.size).toBeGreaterThan(0);
    for (let trial = 0; trial < 30; trial++) {
      for (const b of generateBounties(Date.now(), 150)) {
        for (const w of b.wants) expect(vaultCarIds.has(w.carId)).toBe(false);
      }
    }
  });

  test("claiming a bounty with your only car succeeds and tops the garage with the starter", () => {
    const now = Date.now();
    const s = initialGameState();
    const bounty: WantedBounty = {
      id: "only",
      wants: [{ carId: "rusty-hatch-91", count: 1 }],
      reward: 999,
      expiresAt: now + 3_600_000,
      claimed: false,
    };
    const singleCar: GameState = {
      ...s,
      wantedBounties: [bounty],
      wantedRefreshAt: now,
    };
    const next = gameReducer(singleCar, { type: "SELL_FOR_BOUNTY", bountyId: "only" });
    expect(next.cash).toBe(singleCar.cash + 999); // claim PAYS — the old refusal was the bug
    // The claimed bounty is pruned from the board immediately (slot freed).
    expect(next.wantedBounties.find((b) => b.id === "only")).toBeUndefined();
    // The emptied garage is re-seeded with the starter so the player is never carless.
    expect(next.ownedCars[STARTER_ID]).toBeDefined();
    expect(Object.keys(next.ownedCars).length).toBe(1);
    expect(next.ownedCars[next.activeCarId]).toBeDefined(); // active car always owned
  });

  test("level-up migration never carries claimed across different metrics", () => {
    const now = Date.now();
    const s = initialGameState();
    const weekly = initialWeeklyState(now, 5);
    // Claim the challenge in slot 0 and give a DIFFERENT-metric challenge
    // massive progress in slot 1 — a buggy slot-based migration would mix them.
    const claimedMetric = challengeMetric(weekly.challenges[0]);
    weekly.challenges = weekly.challenges.map((ch, i) =>
      i === 0 ? { ...ch, claimed: true, progress: ch.target } : ch,
    );
    const leveled: GameState = {
      ...s,
      totalEarned: 50_000_000, // level ~32 ≠ 5
      weekly,
    };
    const next = gameReducer(leveled, { type: "WEEKLY_CHECK", now });
    // Exactly the same-metric slot keeps the claim.
    for (const ch of next.weekly.challenges) {
      if (challengeMetric(ch) === claimedMetric) {
        expect(ch.claimed).toBe(true);
      } else {
        expect(ch.claimed).toBe(false);
      }
    }
  });
});

/** Look up a car def in the shared map. */
function generateBountyCar(carId: string) {
  return GAME_CAR_MAP[carId];
}
