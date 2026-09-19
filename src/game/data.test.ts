import { describe, expect, test } from "bun:test";
import { CRATES, GAME_CAR_MAP, gameCarImage, questUnit, generateWeeklyChallenges, fmtMoney } from "./data";
import { crateCost } from "./engine";

describe("fmtMoney display", () => {
  test("keeps cents for sub-$10 rates so car income never reads $0", () => {
    // THE twice-shipped bug class: rounding $0.15 to "$0" made cars look dead.
    expect(fmtMoney(0.15)).toBe("$0.15");
    expect(fmtMoney(0.78)).toBe("$0.78");
    expect(fmtMoney(6)).toBe("$6.00");
    expect(fmtMoney(9.99)).toBe("$9.99");
    // Whole dollars and up: no cents noise.
    expect(fmtMoney(10)).toBe("$10");
    expect(fmtMoney(999)).toBe("$999");
    expect(fmtMoney(10_000)).toBe("$10K");
    // Zero is zero; nothing else regressed.
    expect(fmtMoney(0)).toBe("$0");
    expect(fmtMoney(1_234_567)).toBe("$1.2M");
  });
});

describe("game car images", () => {
  test("resolves a real photo for archive-covered cars", () => {
    const cases = [
      "ferrari-458-12", // alias → 488 GTB
      "rs3-19",
      "m3-08",
      "huracan-15",
      "chiron-17",
      "laferrari-14",
      "amg-gt-15",
      "mclaren-720s-17",
    ];
    for (const id of cases) {
      const img = gameCarImage(GAME_CAR_MAP[id]);
      expect(img, `${id} should resolve a real image`).not.toBe("");
    }
  });

  test("daily drivers and JDM cars now resolve direct photos", () => {
    const cases = [
      "civic-lx-95",
      "corolla-se-97",
      "golf-mk3-94",
      "mx5-nb-00",
      "gti-mk2-90",
      "civic-si-99",
      "supra-mk3-88",
      "skyline-gts-92",
      "brz-13",
      "golf-r-16",
      "type-r-17",
      "supra-mk4-97",
      "skyline-r34-99",
      "amg-a45-19",
      "mustang-gt-15",
      "camaro-ss-16",
      "corvette-c6-08",
    ];
    for (const id of cases) {
      const img = gameCarImage(GAME_CAR_MAP[id]);
      expect(img, `${id} should resolve a real photo`).not.toBe("");
    }
  });

  test("direct photos take precedence and aliases still resolve", () => {
    // civic-lx-95 has a direct photo (no archive twin)
    expect(gameCarImage(GAME_CAR_MAP["civic-lx-95"])).toContain("upload.wikimedia.org");
    // 458 Italia has no archive entry either — resolves via alias to the 488 GTB photo
    expect(gameCarImage(GAME_CAR_MAP["ferrari-458-12"])).toContain("488_GTB");
  });

  test("Rust City beaters, the secret car and one-offs now resolve real photos", () => {
    const cases = ["rusty-hatch-91", "beater-sedan-87", "farm-pickup-80", "ghost-prototype", "crystal-one-24", "infinity-one-27"];
    for (const id of cases) {
      const img = gameCarImage(GAME_CAR_MAP[id]);
      expect(img, `${id} should resolve a real photo`).toContain("upload.wikimedia.org");
    }
  });
});

describe("crate economy", () => {
  test("a cash roll refunds 33–67% of the real crate cost — never profit", () => {
    for (const crate of CRATES) {
      const paid = crateCost(crate.id); // base × CRATE_COST_MULT
      // crateCashRefund is random (1–2× base); pin the bounds via base cost.
      expect(crate.cost, `${crate.id} refund floor < paid ${paid}`).toBeLessThan(paid);
      expect(2 * crate.cost, `${crate.id} refund ceiling below paid ${paid}`).toBeLessThan(paid);
    }
  });

  test("crate costs stay affordable relative to the quest economy", () => {
    // The scrapyard crate (the entry crate) must cost less than ONE full
    // quest board at level 1 — crates are a hobby, quests a real bonus.
    const lvl1Board = 4 * questUnit(1); // rough upper bound on a full board
    expect(crateCost("scrapyard")).toBeLessThan(lvl1Board);
    // And the priciest crate must cost less than 10 questUnits at level 200.
    expect(crateCost("vault")).toBeLessThan(10 * questUnit(200));
  });
});

describe("quest reward balance", () => {
  test("no early-game quest pays more than ~2 hours of mid-car income", () => {
    // THE reported bug: level 3 player claimed $498K for 389 clicks. Under the
    // rebalanced economy every single reward stays within ~2 quest units
    // (questUnit ≈ a mid-range car's passive income for 2.5h), so quests are
    // a hours-scale bonus — never a car purchase.
    for (let lvl = 1; lvl <= 5; lvl++) {
      for (let w = 0; w < 16; w++) {
        const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
          .toISOString()
          .split("T")[0];
        const gen = generateWeeklyChallenges(week, lvl);
        for (const ch of gen) {
          expect(ch.rewardCash, `${ch.name} (lvl ${lvl})`).toBeLessThan(2 * questUnit(lvl));
        }
      }
    }
    // And concretely: a level-3 board can never again pay half a million.
    for (let w = 0; w < 16; w++) {
      const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
        .toISOString()
        .split("T")[0];
      for (const ch of generateWeeklyChallenges(week, 3)) {
        expect(ch.rewardCash).toBeLessThan(50_000);
      }
    }
  });

  test("quest rewards grow with level but stay proportional to income", () => {
    const unit = (l: number) => questUnit(l);
    expect(unit(10)).toBeGreaterThan(unit(1));
    expect(unit(100)).toBeGreaterThan(unit(10));
    // A full board ≈ 1.5–3 quest units at any level.
    for (const lvl of [5, 50, 500]) {
      let sum = 0;
      for (let w = 0; w < 16; w++) {
        const week = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000)
          .toISOString()
          .split("T")[0];
        for (const ch of generateWeeklyChallenges(week, lvl)) sum += ch.rewardCash;
      }
      const avg = sum / 16;
      expect(avg, `lvl ${lvl} board avg ${avg}`).toBeGreaterThan(unit(lvl) * 1.2);
      expect(avg, `lvl ${lvl} board avg ${avg}`).toBeLessThan(unit(lvl) * 10);
    }
  });
});
