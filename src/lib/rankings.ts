import { Gauge, Zap, Banknote, Timer, type LucideIcon } from "lucide-react";
import { carsList } from "@/data/cars";
import { formatNumber, formatPriceCompact } from "@/lib/format";
import type { Car, CurrencyCode } from "@/lib/types";

/** The boards the Rankings page can show. */
export type RankBoardId = "fastest" | "powerful" | "expensive" | "quickest";

export interface RankBoard {
  id: RankBoardId;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** "desc" = higher is better; "asc" = lower is better (sprint times). */
  direction: "desc" | "asc";
  value: (c: Car) => number;
  /** Formats a raw metric value (in the board's own unit) for display. */
  format: (v: number, currency: CurrencyCode) => string;
}

export const RANK_BOARDS: RankBoard[] = [
  {
    id: "fastest",
    label: "Fastest",
    subtitle: "Top speed",
    icon: Gauge,
    direction: "desc",
    value: (c) => c.topSpeedKmh,
    format: (v) => `${formatNumber(v)} km/h`,
  },
  {
    id: "powerful",
    label: "Most Powerful",
    subtitle: "Peak horsepower",
    icon: Zap,
    direction: "desc",
    value: (c) => c.horsepower,
    format: (v) => `${formatNumber(v)} hp`,
  },
  {
    id: "expensive",
    label: "Most Expensive",
    subtitle: "Estimated value",
    icon: Banknote,
    direction: "desc",
    value: (c) => c.priceUSD,
    format: (v, currency) => formatPriceCompact(v, currency),
  },
  {
    id: "quickest",
    label: "Quickest 0–100",
    subtitle: "Sprint — lower wins",
    icon: Timer,
    direction: "asc",
    value: (c) => c.zeroToHundredKmh,
    format: (v) => `${v.toFixed(1)} s`,
  },
];

/** The board for an id (falls back to the first board). */
export function rankBoard(id: RankBoardId): RankBoard {
  return RANK_BOARDS.find((b) => b.id === id) ?? RANK_BOARDS[0];
}

/** Cars ordered by a board's metric, best first, sliced to `limit`. */
export function rankCars(id: RankBoardId, limit = 10): Car[] {
  const board = rankBoard(id);
  return [...carsList()]
    .sort((a, b) =>
      board.direction === "desc"
        ? board.value(b) - board.value(a)
        : board.value(a) - board.value(b),
    )
    .slice(0, limit);
}

/**
 * Row bar width (0–100) relative to the leader — the leader always fills
 * the bar. Descending boards scale value/leader; ascending boards (sprint)
 * scale leader/value so "further from the leader" is always a shorter bar.
 * Zero-safe and clamped.
 */
export function scalePct(
  value: number,
  leaderValue: number,
  direction: "desc" | "asc",
): number {
  if (!Number.isFinite(value) || !Number.isFinite(leaderValue)) return 0;
  const raw =
    direction === "desc"
      ? leaderValue > 0
        ? (value / leaderValue) * 100
        : 0
      : value > 0
        ? (leaderValue / value) * 100
        : 0;
  return Math.max(0, Math.min(100, raw));
}

/** Positive gap between #1 and #2, in the board's own unit (pre-format). */
export function leaderMargin(board: RankBoard, leader: Car, runnerUp: Car): number {
  const a = board.value(leader);
  const b = board.value(runnerUp);
  return board.direction === "desc" ? a - b : b - a;
}
