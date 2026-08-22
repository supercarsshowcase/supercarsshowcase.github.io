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

  test("returns the generated scene (empty) for brands outside the archive", () => {
    const cases = ["rusty-hatch-91", "civic-lx-95", "crystal-one-24"];
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
