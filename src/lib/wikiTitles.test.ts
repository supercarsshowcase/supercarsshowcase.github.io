import { describe, expect, test } from "bun:test";
import {
  asciiSlug,
  carKeyIndex,
  isAsciiKey,
  titleCandidates,
  wikiSlug,
} from "./wikiTitles";
import { CARS } from "../data/cars";

describe("asciiSlug", () => {
  test("NFKD-normalizes accented characters (é → e)", () => {
    expect(asciiSlug("Lamborghini Murciélago")).toBe("Lamborghini_Murcielago");
  });

  test("folds superscripts (4x4² → 4x42) and keeps printable ASCII", () => {
    expect(asciiSlug("Mercedes-AMG G 63 4x4²")).toBe("Mercedes-AMG_G_63_4x42");
  });

  test("every key survives Convex object-field rules", () => {
    // Convex rejects non-ASCII field names — the catalog query 500s if any
    // key smuggles one in (this actually broke production).
    const index = carKeyIndex(CARS);
    for (const slug of Object.keys(index)) {
      expect(isAsciiKey(index[slug]), slug).toBe(true);
    }
  });
});

describe("carKeyIndex", () => {
  test("assigns a unique key to every car slug", () => {
    const index = carKeyIndex(CARS);
    const values = Object.values(index);
    expect(values.length).toBe(CARS.length);
    expect(new Set(values).size).toBe(values.length);
    for (const car of CARS) {
      expect(index[car.slug]?.length, car.slug).toBeGreaterThan(0);
    }
  });

  test("disambiguates same-named generations by slug", () => {
    const index = carKeyIndex(CARS);
    const c7 = index["chevrolet-corvette-c7-zr1"];
    const c6 = index["chevrolet-corvette-c6-zr1"];
    expect(c7).toBeDefined();
    expect(c6).toBeDefined();
    expect(c7).not.toBe(c6); // both would naively be Chevrolet_Corvette_ZR1
    expect(c7).toContain("chevrolet-corvette-c7-zr1");
    expect(c6).toContain("chevrolet-corvette-c6-zr1");
  });

  test("is deterministic across runs (client and seeder must agree)", () => {
    expect(JSON.stringify(carKeyIndex(CARS))).toBe(
      JSON.stringify(carKeyIndex(CARS)),
    );
  });
});

describe("wikiSlug vs asciiSlug", () => {
  test("unicode titles keep their characters in the wiki tier only", () => {
    // Article titles really contain these characters (Lamborghini
    // Murciélago), so lookups must use them — but catalog keys must not.
    expect(wikiSlug("Lamborghini Murciélago")).toContain("é");
    expect(asciiSlug("Lamborghini Murciélago")).not.toContain("é");
  });

  test("trimming candidates keeps the full-title model prefix", () => {
    expect(titleCandidates("Toyota", "Chaser Tourer V")[2]).toBe(
      "Toyota Chaser",
    );
  });
});
