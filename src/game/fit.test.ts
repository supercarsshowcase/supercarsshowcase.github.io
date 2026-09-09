import { describe, test as it, expect } from "bun:test";
import {
  DESIGN_WIDTH,
  MAX_ZOOM,
  MOBILE_BREAKPOINT,
  MOBILE_ZOOM,
  gameZoom,
} from "./fit";

describe("gameZoom", () => {
  it("gives phones the fixed mobile boost", () => {
    expect(gameZoom(320)).toBe(MOBILE_ZOOM);
    expect(gameZoom(390)).toBe(MOBILE_ZOOM);
    expect(gameZoom(MOBILE_BREAKPOINT - 1)).toBe(MOBILE_ZOOM);
  });

  it("clamps to natural size just above the mobile breakpoint", () => {
    expect(gameZoom(MOBILE_BREAKPOINT)).toBe(1);
    expect(gameZoom(900)).toBe(1);
  });

  it("reaches natural size at the design width", () => {
    expect(gameZoom(DESIGN_WIDTH)).toBe(1);
  });

  it("scales linearly with width past the design width", () => {
    expect(gameZoom(DESIGN_WIDTH * 1.5)).toBeCloseTo(1.5, 10);
  });

  it("never exceeds the max zoom cap", () => {
    expect(gameZoom(5000)).toBe(MAX_ZOOM);
    expect(gameZoom(20000)).toBe(MAX_ZOOM);
  });

  it("falls back to 1 for invalid widths", () => {
    expect(gameZoom(0)).toBe(1);
    expect(gameZoom(-100)).toBe(1);
    expect(gameZoom(Number.NaN)).toBe(1);
  });

  it("is a pure function of width (tabs can't resize the UI)", () => {
    for (let w = 200; w <= 3000; w += 50) {
      expect(gameZoom(w)).toBe(gameZoom(w));
    }
  });

  it("is monotonic within the desktop regime (≥ breakpoint)", () => {
    let prev = 0;
    for (let w = MOBILE_BREAKPOINT; w <= 3000; w += 20) {
      const z = gameZoom(w);
      expect(z).toBeGreaterThanOrEqual(1); // never shrinks below natural size
      expect(z).toBeGreaterThanOrEqual(prev);
      expect(z).toBeLessThanOrEqual(MAX_ZOOM);
      prev = z;
    }
  });

  it("is constant within the mobile regime (< breakpoint)", () => {
    for (let w = 200; w < MOBILE_BREAKPOINT; w += 17) {
      expect(gameZoom(w)).toBe(MOBILE_ZOOM);
    }
  });
});
