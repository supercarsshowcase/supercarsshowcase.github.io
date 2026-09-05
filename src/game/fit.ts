/**
 * Pure decision logic for the game UI auto-fit loop (GameMain).
 *
 * GameMain measures the viewport and the game's natural layout height, then
 * asks this module whether the zoom should change. Keeping the decision
 * side-effect free lets it be unit tested with bun test — this loop is the
 * most regression-prone piece of the game shell (it must never shrink long
 * panels into unreadable sizes and never overshoot the viewport).
 */

/** Never scale below this, no matter how tall the content is. */
export const MIN_FIT_ZOOM = 0.5;
/** Never scale beyond this, no matter how tall the screen is. */
export const MAX_ZOOM = 2.2;
/**
 * Grow until the game fills at least this share of the viewport height.
 * Must stay ≤ 1 / GROW_FACTOR so a single growth pass can never overshoot
 * the viewport (0.95 × 1.05 = 0.9975 < 1).
 */
export const FILL_TARGET = 0.95;
/** Multiplicative growth step per fit pass. */
export const GROW_FACTOR = 1.05;
/** Shrink only when content exceeds the available space by this margin (px). */
export const OVERFLOW_SLACK_PX = 2;
/** Zoom deltas smaller than this are ignored to prevent oscillation. */
export const ZOOM_EPSILON = 0.005;

export interface FitInput {
  /** Available height in px (viewport height minus reserved chrome). */
  avail: number;
  /** Natural (unscaled) layout height of the game in px. */
  natural: number;
  /** Current zoom level. */
  zoom: number;
  /** Maximum allowed zoom — the width-based cap. */
  widthTarget: number;
}

/** A zoom change to apply, or null when the current zoom is already right. */
export type FitResult = { next: number } | null;

export function computeFitZoom({
  avail,
  natural,
  zoom,
  widthTarget,
}: FitInput): FitResult {
  if (!(avail > 0) || !(natural > 0)) return null;

  const scaled = natural * zoom;

  // Overflow: shrink exactly into the available space (floored to hundredths
  // so we never clip by a fraction of a pixel), but never below MIN_FIT_ZOOM.
  if (scaled > avail + OVERFLOW_SLACK_PX) {
    const next = Math.max(MIN_FIT_ZOOM, Math.floor((avail / natural) * 100) / 100);
    return next < zoom - ZOOM_EPSILON ? { next } : null;
  }

  // Lots of spare room: grow one step per pass until the game fills the
  // FILL_TARGET share of the viewport or hits the width-based cap. Because
  // FILL_TARGET × GROW_FACTOR < 1, a pass can never overshoot `avail`.
  if (scaled < avail * FILL_TARGET && zoom < widthTarget - ZOOM_EPSILON) {
    return { next: Math.min(widthTarget, zoom * GROW_FACTOR) };
  }

  return null;
}
