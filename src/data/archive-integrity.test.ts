import { describe, expect, test } from "bun:test";
import { CARS } from "./cars";
import { BRANDS } from "./brands";
import { getCarImage } from "./images";
import {
  GAME_CARS,
  GAME_CAR_MAP,
  ARCHIVE_GAME_CARS,
  DEALERS,
} from "../game/data";
import {
  spinSupercarPool,
  spinSupercarPool01,
  spinSupercarPool001,
} from "../game/engine";

/**
 * Contract pins for the 1000-car archive expansion. The runtime guard in
 * cars.ts throws on duplicate slugs at module load; these tests pin the
 * rest of the invariants the archive must keep as cars are added or edited.
 */

describe("archive integrity", () => {
  test("showcase has exactly 1000 cars (88 hand-written + 912 expansion)", () => {
    expect(CARS.length).toBe(1000);
  });

  test("every car slug is unique", () => {
    const seen = new Set<string>();
    for (const car of CARS) {
      expect(seen.has(car.slug), `duplicate slug: ${car.slug}`).toBe(false);
      seen.add(car.slug);
    }
  });

  test("no photo URL appears on two cars (no photo copies)", () => {
    const byUrl = new Map<string, string>();
    for (const car of CARS) {
      // getCarImage takes the Car object (it keys off car.slug internally).
      const img = getCarImage(car);
      if (!img) continue; // expansion cars intentionally use generated scenes
      expect(
        byUrl.has(img),
        `photo shared by ${byUrl.get(img)} and ${car.slug}`,
      ).toBe(false);
      byUrl.set(img, car.slug);
    }
    // The check must actually see photos — otherwise it passes vacuously.
    expect(byUrl.size).toBeGreaterThan(80);
  });

  test("no two cars share brand+model", () => {
    const seen = new Set<string>();
    for (const car of CARS) {
      const key = `${car.brand}|${car.model}`;
      expect(seen.has(key), `duplicate brand+model: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  test("every car has all display fields populated", () => {
    for (const car of CARS) {
      expect(car.brand.length, car.slug).toBeGreaterThan(0);
      expect(car.model.length, car.slug).toBeGreaterThan(0);
      // Regression: unknown engine codes used to produce engine: undefined.
      expect(car.engine.length, car.slug).toBeGreaterThan(0);
      expect(car.description.length, car.slug).toBeGreaterThan(0);
      expect(car.transmission.length, car.slug).toBeGreaterThan(0);
      expect(car.bodyStyle.length, car.slug).toBeGreaterThan(0);
      expect(car.production.length, car.slug).toBeGreaterThan(0);
      expect(car.driveType.length, car.slug).toBeGreaterThan(0);
    }
  });

  test("specs stay inside physically plausible bands", () => {
    for (const car of CARS) {
      expect(car.priceUSD, car.slug).toBeGreaterThan(0);
      expect(car.priceUSD, car.slug).toBeLessThan(100_000_000);
      expect(car.horsepower, car.slug).toBeGreaterThan(0);
      expect(car.horsepower, car.slug).toBeLessThanOrEqual(2500);
      expect(car.torqueNm, car.slug).toBeGreaterThan(0);
      expect(car.zeroToHundredKmh, car.slug).toBeGreaterThanOrEqual(1);
      expect(car.zeroToHundredKmh, car.slug).toBeLessThanOrEqual(30);
      expect(car.topSpeedKmh, car.slug).toBeGreaterThanOrEqual(90);
      expect(car.topSpeedKmh, car.slug).toBeLessThanOrEqual(550);
      // Heavy commercial entries (Bentley State Limousine ≈ 4.5 t,
      // Tesla Semi ≈ 15 t) far exceed the civilian 2 t ceiling — the bound
      // still catches corrupted/zero/NaN weights.
      expect(car.weightKg, car.slug).toBeGreaterThanOrEqual(300);
      expect(car.weightKg, car.slug).toBeLessThanOrEqual(16_000);
      expect(car.year, car.slug).toBeGreaterThanOrEqual(1900);
      expect(car.year, car.slug).toBeLessThanOrEqual(2027);
      expect(Number.isFinite(car.priceUSD), car.slug).toBe(true);
    }
  });

  test("car marques and Brand entries stay 1:1 (no dead brand links)", () => {
    const carBrands = new Set(CARS.map((c) => c.brand));
    for (const brand of carBrands) {
      expect(
        BRANDS.some((b) => b.name === brand),
        `car brand without Brand entry: ${brand}`,
      ).toBe(true);
    }
    for (const brand of BRANDS) {
      expect(
        carBrands.has(brand.name),
        `Brand entry with no cars: ${brand.name}`,
      ).toBe(true);
    }
  });
});

describe("game archive coverage", () => {
  test("exactly 1088 collectible cars (base ladder + 1000 archive + casino specials)", () => {
    expect(GAME_CARS.length).toBe(1088);
    expect(ARCHIVE_GAME_CARS.length).toBe(1000);
  });

  test("every showcase car is collectible in the game", () => {
    const ids = new Set(GAME_CARS.map((c) => c.id));
    for (const car of CARS) {
      expect(ids.has(car.slug), `not collectible: ${car.slug}`).toBe(true);
    }
  });

  test("game car ids are unique and resolve in GAME_CAR_MAP", () => {
    const seen = new Set<string>();
    for (const def of GAME_CARS) {
      expect(seen.has(def.id), `duplicate game id: ${def.id}`).toBe(false);
      seen.add(def.id);
      expect(GAME_CAR_MAP[def.id]?.id).toBe(def.id);
    }
  });

  test("archive-derived defs have sane economy values (untouched economy)", () => {
    for (const def of ARCHIVE_GAME_CARS) {
      expect(Number.isFinite(def.value), def.id).toBe(true);
      expect(def.value, def.id).toBeGreaterThan(0);
      expect(def.unlockLevel, def.id).toBeGreaterThanOrEqual(1);
      expect(def.unlockLevel, def.id).toBeLessThanOrEqual(400);
      expect(def.crateTier, def.id).toBeGreaterThanOrEqual(1);
      expect(def.crateTier, def.id).toBeLessThanOrEqual(10);
      expect(def.dealer.length, def.id).toBeGreaterThan(0);
    }
  });

  test("every dealer pool id resolves to a real game car", () => {
    for (const dealer of DEALERS) {
      for (const id of dealer.pool) {
        expect(GAME_CAR_MAP[id], `${dealer.id} pool: ${id}`).toBeDefined();
      }
    }
  });

  test("spin pools are non-empty and label-matched", () => {
    expect(spinSupercarPool().length).toBeGreaterThan(0);
    expect(spinSupercarPool01().length).toBeGreaterThan(0);
    expect(spinSupercarPool001().length).toBeGreaterThan(0);
    // Tier badges promise value ranges — pools must honor them.
    for (const c of spinSupercarPool()) {
      expect(c.value).toBeGreaterThanOrEqual(10_000_000);
      expect(c.value).toBeLessThanOrEqual(30_000_000);
    }
    for (const c of spinSupercarPool01()) {
      expect(c.value).toBeGreaterThanOrEqual(100_000_000);
      expect(c.value).toBeLessThanOrEqual(300_000_000);
    }
    for (const c of spinSupercarPool001()) {
      expect(c.value).toBeGreaterThanOrEqual(1_000_000_000);
    }
  });
});
