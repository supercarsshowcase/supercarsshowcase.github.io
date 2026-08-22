import { describe, expect, test } from "bun:test";
import {
  CARS,
  applyCarOverrides,
  carsList,
  mergedCarBySlug,
} from "./cars";

describe("owner car overrides", () => {
  test("stock data is returned when no overrides are applied", () => {
    applyCarOverrides(null);
    expect(carsList().length).toBe(CARS.length);
    expect(carsList()[0].model).toBe(CARS[0].model);
  });

  test("applyCarOverrides merges edits on top of stock cars", () => {
    const slug = CARS[0].slug;
    applyCarOverrides({ [slug]: { model: "Renamed Model", priceUSD: 999 } });

    const merged = mergedCarBySlug(slug);
    expect(merged?.model).toBe("Renamed Model");
    expect(merged?.priceUSD).toBe(999);
    // Untouched fields keep their stock values.
    expect(merged?.brand).toBe(CARS[0].brand);
    // Other cars are untouched.
    expect(mergedCarBySlug(CARS[1].slug)?.model).toBe(CARS[1].model);

    applyCarOverrides(null);
  });

  test("carsList reflects overrides and agrees with mergedCarBySlug", () => {
    const slug = CARS[1].slug;
    applyCarOverrides({ [slug]: { horsepower: 1234 } });

    expect(carsList().find((c) => c.slug === slug)?.horsepower).toBe(1234);
    expect(mergedCarBySlug(slug)?.horsepower).toBe(1234);

    applyCarOverrides(null);
  });

  test("mergedCarBySlug returns undefined for unknown slugs", () => {
    applyCarOverrides(null);
    expect(mergedCarBySlug("does-not-exist")).toBeUndefined();
  });
});
