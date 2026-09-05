import { describe, test as it, expect } from "bun:test";
import { computeFitZoom, nonEarnTabZoom, MAX_ZOOM, MIN_FIT_ZOOM } from "./fit";

function run(
  avail: number,
  natural: number,
  zoom: number,
  widthTarget: number = MAX_ZOOM,
) {
  return computeFitZoom({ avail, natural, zoom, widthTarget });
}

describe("computeFitZoom", () => {
  it("returns null for invalid measurements", () => {
    expect(run(0, 1000, 1)).toBeNull();
    expect(run(800, 0, 1)).toBeNull();
    expect(run(-100, 1000, 1)).toBeNull();
  });

  it("shrinks exactly into the available space on overflow", () => {
    // 1000px of content in 800px of space → zoom 0.80 (floored to hundredths).
    const result = run(800, 1000, 1);
    expect(result).toEqual({ next: 0.8 });
  });

  it("never shrinks below MIN_FIT_ZOOM even for extreme overflow", () => {
    const result = run(300, 1000, 1); // exact fit would be 0.3
    expect(result).toEqual({ next: MIN_FIT_ZOOM });
  });

  it("does nothing when the game already fits exactly", () => {
    expect(run(800, 1000, 0.8)).toBeNull();
  });

  it("ignores overflow inside the 2px slack so it never oscillates", () => {
    // scaled = 801 and 802 are within OVERFLOW_SLACK_PX of avail 800.
    expect(run(800, 1000, 0.801)).toBeNull();
    expect(run(800, 1000, 0.802)).toBeNull();
    // 810 crosses the slack → shrink back to the exact fit.
    expect(run(800, 1000, 0.81)).toEqual({ next: 0.8 });
  });

  it("grows to fill the slot exactly when there is spare room", () => {
    // 800px of content in 1000px of space → exact fill zoom 1.25 (100%).
    const result = run(1000, 800, 1, 1.4);
    expect(result).toEqual({ next: 1.25 });
  });

  it("caps growth at the width-based target", () => {
    const result = run(1000, 800, 1, 1.03);
    expect(result).toEqual({ next: 1.03 });
  });

  it("stops growing once the width cap is reached", () => {
    // 700px content in 1000px space: at the 1.3 cap the game fills 91% —
    // under the 95% fill target, but the cap forbids further growth.
    expect(run(1000, 700, 1.3, 1.3)).toBeNull();
  });

  it("fitting takes priority over the width cap on overflow", () => {
    // 800px content at the 1.4 cap = 1120px — overflows 1000px of space,
    // so the shrink branch wins and lands on the exact fit (1.25).
    expect(run(1000, 800, 1.4, 1.4)).toEqual({ next: 1.25 });
  });

  it("a single fit pass can never overshoot the viewport", () => {
    // Worst case: scaled sits just under the dead zone; the exact-fill jump
    // must land at (or below) the available height, never past it.
    const avail = 1000;
    const natural = 999.99;
    const zoom = 0.95; // scaled ≈ 949.99, just under avail − slack
    const result = run(avail, natural, zoom, MAX_ZOOM);
    expect(result).not.toBeNull();
    expect(natural * result!.next).toBeLessThanOrEqual(avail);
  });

  it("fills the whole slot with no black band left over", () => {
    const avail = 956;
    const natural = 650;
    const result = run(avail, natural, 1, MAX_ZOOM);
    expect(result).not.toBeNull();
    expect(Math.abs(natural * result!.next - avail)).toBeLessThan(0.001);
  });

  it("converges without overshooting when shrinking", () => {
    let zoom = 1;
    for (let i = 0; i < 10; i++) {
      const result = run(800, 1000, zoom);
      if (!result) break;
      zoom = result.next;
    }
    expect(zoom).toBe(0.8);
    // Fully applied, the scaled height never exceeds the space.
    expect(1000 * zoom).toBeLessThanOrEqual(800 + 2);
  });

  it("converges without overshooting when growing", () => {
    let zoom = 1;
    for (let i = 0; i < 50; i++) {
      const result = run(1000, 800, zoom, 1.4);
      if (!result) break;
      zoom = result.next;
    }
    // Fills the slot completely (exact 100% fit) without exceeding it.
    expect(800 * zoom).toBeGreaterThanOrEqual(1000 * 0.999);
    expect(zoom).toBeLessThanOrEqual(1.4);
    expect(800 * zoom).toBeLessThanOrEqual(1000 + 2);
  });
});

describe("nonEarnTabZoom", () => {
  it("grows to the width-based target on wide screens", () => {
    expect(nonEarnTabZoom(1.25)).toBe(1.25);
    expect(nonEarnTabZoom(2.2)).toBe(2.2);
  });

  it("never shrinks below natural size", () => {
    expect(nonEarnTabZoom(0.8)).toBe(1);
    expect(nonEarnTabZoom(1)).toBe(1);
  });

  it("keeps the same zoom when switching between tabs (no size jump)", () => {
    // The same widthTarget must produce the identical zoom for every tab,
    // so Garage ↔ Crates ↔ Index never visibly resize the sidebar.
    const widthTarget = 1.18;
    expect(nonEarnTabZoom(widthTarget)).toBe(widthTarget);
    expect(nonEarnTabZoom(widthTarget)).toBe(nonEarnTabZoom(widthTarget));
  });
});
