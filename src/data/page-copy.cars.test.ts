import { describe, expect, test } from "bun:test";
import { GARAGE_COPY, HOME_COPY } from "./page-copy";
import { CARS, carsList } from "./cars";

describe("HOME_COPY.featuredSlugs", () => {
  test("every featured slug resolves to a real car in the archive", () => {
    const slugs = HOME_COPY.featuredSlugs.split(",").map((s) => s.trim()).filter(Boolean);
    expect(slugs.length).toBeGreaterThan(0);

    const realSlugs = new Set(CARS.map((c) => c.slug));
    for (const slug of slugs) {
      expect(realSlugs.has(slug)).toBe(true);
    }
  });

  test("featured cars are non-duplicates and survive owner-edit merges", () => {
    const slugs = HOME_COPY.featuredSlugs.split(",").map((s) => s.trim()).filter(Boolean);
    const merged = new Map(carsList().map((c) => [c.slug, c]));

    expect(new Set(slugs).size).toBe(slugs.length); // no duplicates
    for (const slug of slugs) {
      expect(merged.get(slug)).toBeDefined();
    }
  });
});

describe("GARAGE_COPY", () => {
  test("results label renders at least one digit-width number", () => {
    // Guards against the {n} token being dropped from the template.
    expect(GARAGE_COPY.resultsLbl).toContain("{n}");
  });
});
