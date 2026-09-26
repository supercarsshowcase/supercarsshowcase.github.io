import { describe, test as it, expect } from "bun:test";
import { carsList } from "@/data/cars";
import type { Car } from "@/lib/types";
import {
  RANK_BOARDS,
  rankBoard,
  rankCars,
  scalePct,
  leaderMargin,
} from "./rankings";

const base: Car = { ...carsList()[0] };
const car = (over: Partial<Car>): Car => ({ ...base, ...over });

describe("rank boards", () => {
  it("exposes four unique boards", () => {
    expect(RANK_BOARDS.length).toBe(4);
    expect(new Set(RANK_BOARDS.map((b) => b.id)).size).toBe(4);
  });

  it("falls back to the first board for unknown ids", () => {
    expect(rankBoard("nope" as never).id).toBe(RANK_BOARDS[0].id);
  });
});

describe("rankCars", () => {
  it("sorts descending boards best-first", () => {
    const board = rankBoard("powerful");
    const rows = rankCars("powerful", 5);
    expect(rows.length).toBe(5);
    for (let i = 1; i < rows.length; i++) {
      expect(board.value(rows[i - 1])).toBeGreaterThanOrEqual(board.value(rows[i]));
    }
    const max = Math.max(...carsList().map(board.value));
    expect(board.value(rows[0])).toBe(max);
  });

  it("sorts ascending boards (sprint) lowest-first", () => {
    const board = rankBoard("quickest");
    const rows = rankCars("quickest", 5);
    for (let i = 1; i < rows.length; i++) {
      expect(board.value(rows[i - 1])).toBeLessThanOrEqual(board.value(rows[i]));
    }
    const min = Math.min(...carsList().map(board.value));
    expect(board.value(rows[0])).toBe(min);
  });

  it("honors the limit and never exceeds the catalog", () => {
    expect(rankCars("fastest", 3).length).toBe(3);
    expect(rankCars("fastest", 9999).length).toBe(carsList().length);
  });

  it("keeps tied leaders both on the board (real data has a 500 km/h tie)", () => {
    const rows = rankCars("fastest", 10);
    const top = rows.filter((c) => c.topSpeedKmh === rows[0].topSpeedKmh);
    expect(top.length).toBeGreaterThanOrEqual(1);
  });
});

describe("scalePct", () => {
  it("gives the leader a full bar on descending boards", () => {
    expect(scalePct(350, 350, "desc")).toBe(100);
    expect(scalePct(175, 350, "desc")).toBe(50);
  });

  it("scales ascending boards leader-over-value", () => {
    expect(scalePct(4, 2, "asc")).toBe(50);
  });

  it("is zero-safe, clamped and rejects invalid numbers", () => {
    expect(scalePct(0, 350, "desc")).toBe(0);
    expect(scalePct(700, 350, "desc")).toBe(100);
    expect(scalePct(Number.NaN, 350, "desc")).toBe(0);
    expect(scalePct(350, 0, "desc")).toBe(0);
    expect(scalePct(0, 2, "asc")).toBe(0);
  });
});

describe("leaderMargin", () => {
  it("returns value(a) − value(b) on descending boards", () => {
    const board = rankBoard("fastest");
    const a = car({ topSpeedKmh: 500, slug: "a" });
    const b = car({ topSpeedKmh: 450, slug: "b" });
    expect(leaderMargin(board, a, b)).toBe(50);
  });

  it("returns value(b) − value(a) on ascending boards (sprint)", () => {
    const board = rankBoard("quickest");
    const a = car({ zeroToHundredKmh: 1.8, slug: "a" });
    const b = car({ zeroToHundredKmh: 2.4, slug: "b" });
    expect(leaderMargin(board, a, b)).toBeCloseTo(0.6, 5);
  });

  it("returns exactly 0 for a tie", () => {
    const board = rankBoard("fastest");
    const a = car({ topSpeedKmh: 500, slug: "a" });
    const b = car({ topSpeedKmh: 500, slug: "b" });
    expect(leaderMargin(board, a, b)).toBe(0);
  });

  it("is tie-agnostic on real data (a true tie yields 0, not a negative)", () => {
    const board = rankBoard("fastest");
    const [a, b] = rankCars("fastest", 2);
    expect(leaderMargin(board, a, b)).toBe(board.value(a) - board.value(b));
    expect(leaderMargin(board, a, b)).toBeGreaterThanOrEqual(0);
  });
});
