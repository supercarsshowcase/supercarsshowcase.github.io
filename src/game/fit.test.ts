import { describe, test as it, expect } from "bun:test";
import { SITE_ZOOM, gameZoom } from "./fit";

describe("site zoom policy", () => {
  it("renders the whole site at browser-zoom scale (natural size)", () => {
    expect(SITE_ZOOM).toBe(1);
  });

  it("gives the game shell the site zoom at every width", () => {
    for (const w of [320, 390, 767, 768, 1024, 1180, 1440, 1920, 2560, 4000]) {
      expect(gameZoom(w)).toBe(SITE_ZOOM);
    }
  });

  it("is a pure function (same width, same zoom — tabs can't resize the UI)", () => {
    for (let w = 200; w <= 3000; w += 97) {
      expect(gameZoom(w)).toBe(gameZoom(w));
    }
  });

  it("never scales any page up or down across the whole range", () => {
    for (let w = 200; w <= 3000; w += 50) {
      expect(gameZoom(w)).toBe(1);
    }
  });
});
