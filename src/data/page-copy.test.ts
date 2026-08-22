import { describe, expect, test } from "bun:test";
import { GARAGE_COPY, HOME_COPY, NAV_COPY, tmpl } from "./page-copy";

describe("tmpl", () => {
  test("replaces named tokens with values", () => {
    expect(tmpl("{n} MACHINES ARCHIVED.", { n: 157 })).toBe(
      "157 MACHINES ARCHIVED.",
    );
  });

  test("leaves unknown tokens untouched", () => {
    expect(tmpl("{n} of {x}", { n: 3 })).toBe("3 of {x}");
  });
});

describe("copy defaults", () => {
  test("garage heading and results label use the {n} token", () => {
    expect(GARAGE_COPY.heading).toContain("{n}");
    expect(GARAGE_COPY.resultsLbl).toContain("{n}");
  });

  test("nav copy covers every label key the shell renders", () => {
    const keys = [
      "home",
      "garage",
      "rankings",
      "favorites",
      "myGarage",
      "feedback",
      "admin",
      "compare",
      "surprise",
      "signIn",
      "signOut",
      "myFavorites",
      "editProfile",
      "compareMachines",
      "adminPanel",
    ];
    for (const k of keys) {
      expect(NAV_COPY[k]).toBeTruthy();
    }
  });

  test("every home and garage field has a non-empty default", () => {
    for (const value of Object.values(HOME_COPY)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
    for (const value of Object.values(GARAGE_COPY)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
