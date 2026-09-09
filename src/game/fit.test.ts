import { describe, test as it, expect } from "bun:test";
import { gameZoom } from "./fit";

describe("gameZoom", () => {
  it("renders at natural size — the browser's own zoom — at every width", () => {
    for (const w of [320, 390, 767, 768, 1024, 1180, 1440, 1920, 2560, 4000]) {
      expect(gameZoom(w)).toBe(1);
    }
  });

  it("is a pure function (same width, same zoom — tabs can't resize the UI)", () => {
    for (let w = 200; w <= 3000; w += 97) {
      expect(gameZoom(w)).toBe(gameZoom(w));
    }
  });

  it("never scales the UI up or down across the whole range", () => {
    for (let w = 200; w <= 3000; w += 50) {
      const z = gameZoom(w);
      expect(z).toBeGreaterThan(0);
      expect(z).toBe(1);
    }
  });
});
