import { describe, expect, test } from "bun:test";
import { CRATES, GAME_CAR_MAP, gameCarImage } from "./data";

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

  test("returns the generated scene for fictional cars with no photo", () => {
    const cases = ["rusty-hatch-91", "beater-sedan-87", "crystal-one-24"];
    for (const id of cases) {
      expect(gameCarImage(GAME_CAR_MAP[id]), `${id} should stay on the scene`).toBe("");
    }
  });
});

describe("crate economy", () => {
  test("every crate's expected cash payout is below its cost", () => {
    for (const crate of CRATES) {
      const avg = (crate.cashMin + crate.cashMax) / 2;
      expect(avg, `${crate.id} expected cash ${avg} < cost ${crate.cost}`).toBeLessThan(
        crate.cost,
      );
    }
  });
});
