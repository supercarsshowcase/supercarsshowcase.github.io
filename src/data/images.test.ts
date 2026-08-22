import { describe, expect, test } from "bun:test";
import { CARS } from "./cars";
import {
  carWikiTitle,
  getBrandImage,
  getCarGallery,
  getCarImage,
  getCarImageHiRes,
  resizeWikiImage,
} from "./images";
import type { Car } from "../lib/types";

const BASE: Car = {
  slug: "test-car",
  brand: "Bugatti",
  model: "Chiron",
  year: 2016,
  category: "Hypercar",
  priceUSD: 3_000_000,
  engine: "8.0L W16 Quad-Turbo",
  horsepower: 1500,
  torqueNm: 1600,
  zeroToHundredKmh: 2.4,
  topSpeedKmh: 420,
  weightKg: 1995,
  driveType: "All-Wheel Drive",
  transmission: "7-Speed Dual-Clutch",
  bodyStyle: "Coupé",
  production: "2016–present",
  description: "test",
};

function car(overrides: Partial<Car> = {}): Car {
  return { ...BASE, ...overrides };
}

describe("resizeWikiImage", () => {
  const src =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/960px-Bugatti_Chiron_1.jpg";

  test("rewrites the thumbnail width bucket", () => {
    expect(resizeWikiImage(src, 1920)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/1920px-Bugatti_Chiron_1.jpg",
    );
  });

  test("rewrites any existing bucket width, not only 960", () => {
    const small = src.replace("/960px-", "/330px-");
    expect(resizeWikiImage(small, 960)).toContain("/960px-");
    expect(resizeWikiImage(small, 960)).not.toContain("/330px-");
  });

  test("leaves URLs without a width bucket unchanged", () => {
    const plain = "https://example.com/photo.jpg";
    expect(resizeWikiImage(plain, 1920)).toBe(plain);
  });
});

describe("carWikiTitle", () => {
  test("joins brand and model for standard marques", () => {
    expect(carWikiTitle(car({ brand: "Bugatti", model: "Chiron" }))).toBe(
      "Bugatti Chiron",
    );
  });

  test("strips the redundant M prefix for BMW M", () => {
    expect(carWikiTitle(car({ brand: "BMW M", model: "M3 CSL" }))).toBe(
      "BMW M3 CSL",
    );
  });

  test("uses Audi instead of Audi Sport", () => {
    expect(carWikiTitle(car({ brand: "Audi Sport", model: "R8 V10" }))).toBe(
      "Audi R8 V10",
    );
  });

  test("strips a leading AMG from Mercedes-AMG models", () => {
    expect(
      carWikiTitle(car({ brand: "Mercedes-AMG", model: "AMG GT" })),
    ).toBe("Mercedes-AMG GT");
    expect(
      carWikiTitle(car({ brand: "Mercedes-AMG", model: "GT 63 S" })),
    ).toBe("Mercedes-AMG GT 63 S");
  });
});

describe("static image lookups", () => {
  const chiron = car({ slug: "bugatti-chiron" });

  test("returns a real primary image for a known car", () => {
    const img = getCarImage(chiron);
    expect(img).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(img).toContain("/960px-");
  });

  test("returns a 1920px hi-res variant for the detail hero", () => {
    const img = getCarImageHiRes(chiron);
    expect(img).toContain("/1920px-");
  });

  test("returns an empty string for unknown cars", () => {
    expect(getCarImage(car({ slug: "does-not-exist" }))).toBe("");
    expect(getCarImageHiRes(car({ slug: "does-not-exist" }))).toBe("");
  });

  test("returns brand images for known marques only", () => {
    expect(getBrandImage("Bugatti")).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(getBrandImage("Not a marque")).toBe("");
  });
});

describe("getCarGallery", () => {
  test("always produces five distinct, labelled views", () => {
    const gallery = getCarGallery(car({ slug: "bugatti-chiron" }));
    expect(gallery).toHaveLength(5);
    expect(new Set(gallery.map((g) => g.seed)).size).toBe(5);
    expect(gallery.map((g) => g.label)).toEqual([
      "Studio front",
      "Marque archive",
      "Rear three-quarter",
      "Side profile",
      "Cockpit",
    ]);
  });

  test("uses the real car photo for view 0 and the marque photo for view 1", () => {
    const gallery = getCarGallery(car({ slug: "bugatti-chiron" }));
    expect(gallery[0].src).toBeTruthy();
    expect(gallery[1].src).toBeTruthy();
    expect(gallery[1].src).not.toBe(gallery[0].src);
  });

  test("falls back to empty sources for unknown cars", () => {
    const gallery = getCarGallery(car({ slug: "does-not-exist" }));
    expect(gallery[0].src).toBe("");
  });
});

describe("data integrity", () => {
  test("every car has a unique slug and a real photo", () => {
    const slugs = new Set<string>();
    for (const c of CARS) {
      expect(slugs.has(c.slug)).toBe(false);
      slugs.add(c.slug);
      expect(getCarImage(c)).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    }
  });

  test("every marque used by a car has a brand image", () => {
    for (const c of CARS) {
      expect(getBrandImage(c.brand)).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    }
  });
});
