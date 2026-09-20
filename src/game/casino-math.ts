/**
 * Pure casino payout math — no React, no Convex, fully unit-testable.
 * Shared by CasinoPanel's Mines game.
 */

/**
 * Fair-mines payout: C(25,k)/C(25−m,k) with a 3% house edge.
 *
 * This is the exact inverse of the probability of surviving k safe picks
 * with m mines on the board: P(survive k) = C(safe,k)/C(tiles,k), so paying
 * its reciprocal makes every cashout depth EV-neutral before the edge.
 *
 * The old inline formula (1 + k/safe × m×1.2) was player-favorable — one
 * safe tile on a 5-mine board paid 1.30× against 80% survival (EV 1.04),
 * an infinite printer via single-tile cashouts.
 */
export function minesMultiplier(revealed: number, mineCount: number, tiles: number): number {
  const safe = tiles - mineCount;
  let fair = 1;
  for (let i = 0; i < revealed; i++) fair *= (tiles - i) / (safe - i);
  return 0.97 * fair;
}

/** Probability of safely revealing `revealed` tiles with `mineCount` mines. */
export function minesSurvival(revealed: number, mineCount: number, tiles: number): number {
  const safe = tiles - mineCount;
  let p = 1;
  for (let i = 0; i < revealed; i++) p *= (safe - i) / (tiles - i);
  return p;
}

/**
 * Draw a winner weighted by each entry's stake (`amount`), as real jackpot
 * sites do. Returns undefined only for an empty list.
 *
 * The old uniform pick over players let a $10K entry win a ~$2M pot at
 * 1/(N+1) odds regardless of stake — a massive positive-EV printer.
 */
export function pickWeighted<T extends { amount: number }>(entries: T[]): T | undefined {
  if (entries.length === 0) return undefined;
  const total = entries.reduce((s, e) => s + Math.max(0, e.amount), 0);
  if (total <= 0) return entries[Math.floor(Math.random() * entries.length)];
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= Math.max(0, e.amount);
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}
