import { describe, test as it, expect } from "bun:test";
import { SITE_ZOOM, gameZoom, vpCap, vpFill } from "./fit";

/** The 0.5rem×2 root padding that vpCap subtracts. */
const ROOT_PAD_REM = 1;

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

describe("viewport fill helpers", () => {
  it("vpFill lands at exactly one viewport after scaling (no dead band)", () => {
    for (const zoom of [1, 1.1, 1.25, 2]) {
      const m = vpFill(zoom).match(/calc\(100dvh \/ ([\d.]+)\)/);
      expect(m).not.toBeNull();
      const divisor = Number(m![1]);
      // divisor must equal the zoom exactly, so divisor × zoom = 100dvh
      expect(divisor * zoom).toBeCloseTo(zoom * zoom, 10);
      expect(divisor).toBeCloseTo(zoom, 10);
    }
  });

  it("vpCap is vpFill minus the root padding (rails never exceed the viewport)", () => {
    for (const zoom of [1, 1.1, 1.25, 2]) {
      // Subtraction must be INSIDE the calc() — `calc(A) - B` is invalid CSS.
      expect(vpCap(zoom)).toBe(`calc(100dvh / ${zoom} - ${ROOT_PAD_REM}rem)`);
    }
  });

  it("falls back to a safe divisor when the zoom factor is invalid", () => {
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(vpFill(bad)).toBe("calc(100dvh / 1)");
      expect(vpCap(bad)).toBe("calc(100dvh / 1 - 1rem)");
    }
  });

  it("uses the TOTAL effective zoom, not the site zoom alone", () => {
    // This is the regression: the sidebar previously divided by the site
    // zoom only, so a non-1 game zoom would make its cap too tall.
    expect(vpFill(1.5)).not.toBe(vpFill(1));
    expect(vpCap(1.5)).toContain("/ 1.5");
  });
});
