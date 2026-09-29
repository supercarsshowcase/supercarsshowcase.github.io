import { describe, expect, test } from "bun:test";
import {
  wikiTitle,
  titleCandidates,
  wikiSlug,
  cachedEnriched,
  cachedCarImage,
} from "./enrich";
import { CARS } from "./cars";
import { getCarImage } from "./images";

describe("wikiTitle", () => {
  test("standard marques join brand and model", () => {
    expect(wikiTitle("Toyota", "Supra")).toBe("Toyota Supra");
  });

  test("BMW M prefixes the model with BMW", () => {
    expect(wikiTitle("BMW M", "M3 Competition")).toBe("BMW M3 Competition");
  });

  test("Audi Sport prefixes the model with Audi", () => {
    expect(wikiTitle("Audi Sport", "RS6 Avant")).toBe("Audi RS6 Avant");
  });

  test("Mercedes-AMG strips a redundant AMG prefix from the model", () => {
    expect(wikiTitle("Mercedes-AMG", "AMG GT Black Series")).toBe(
      "Mercedes-AMG GT Black Series",
    );
    expect(wikiTitle("Mercedes-AMG", "C63 S")).toBe("Mercedes-AMG C63 S");
  });
});

describe("titleCandidates", () => {
  test("short titles yield a single candidate", () => {
    expect(titleCandidates("Toyota", "Supra")).toEqual(["Toyota Supra"]);
  });

  test("long trim-level titles trim progressively down to two tokens", () => {
    // 4 tokens → full, minus trim word, base model (Toyota Chaser exists).
    expect(titleCandidates("Toyota", "Chaser Tourer V")).toEqual([
      "Toyota Chaser Tourer V",
      "Toyota Chaser Tourer",
      "Toyota Chaser",
    ]);
  });

  test("candidates are capped at 3", () => {
    const out = titleCandidates("Nissan", "Skyline GT-R V-Spec II Nur");
    expect(out.length).toBe(3);
  });

  test("paren-suffixed models keep the paren in the full title", () => {
    // wikiSlug later collapses the paren — candidates must first try the
    // exact article title used on Wikipedia for generation-specific models.
    const out = titleCandidates("Honda", "Civic Type R (FL5)");
    expect(out[0]).toBe("Honda Civic Type R (FL5)");
  });
});

describe("wikiSlug", () => {
  test("spaces become underscores", () => {
    expect(wikiSlug("Toyota Supra")).toBe("Toyota_Supra");
  });

  test("disambiguation parens are stripped", () => {
    expect(wikiSlug("Honda Civic Type R (FL5)")).toBe("Honda_Civic_Type_R");
  });

  test("paren-stripped titles dedupe against their base variant", () => {
    const [a, b] = [
      wikiSlug("Honda Civic Type R (FL5)"),
      wikiSlug("Honda Civic Type R"),
    ];
    expect(a).toBe(b);
  });
});

describe("cachedCarImage", () => {
  test("prefers the hand-verified static photo", () => {
    const car = CARS.find((c) => getCarImage(c))!;
    expect(cachedCarImage(car)).toBe(getCarImage(car));
  });

  test("returns a string for every car (never undefined)", () => {
    for (const car of CARS.slice(0, 120)) {
      expect(typeof cachedCarImage(car)).toBe("string");
    }
  });

  test("enrichment-only lookup ignores static photos", () => {
    // bun test has no localStorage, so cachedEnriched reads an empty cache —
    // it must return "" even for cars that DO have a static photo.
    const car = CARS.find((c) => getCarImage(c))!;
    expect(cachedEnriched(car)).toBe("");
  });
});

describe("archive coverage of enrichment titles", () => {
  test("every car generates at least one non-empty candidate title", () => {
    for (const car of CARS) {
      const out = titleCandidates(car.brand, car.model);
      expect(out.length, car.slug).toBeGreaterThanOrEqual(1);
      for (const title of out) {
        expect(title.length, `${car.slug}: ${title}`).toBeGreaterThan(0);
        expect(title, car.slug).not.toBe("undefined");
      }
    }
  });
});
