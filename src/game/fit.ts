/**
 * Pure decision logic for the game UI auto-fit loop (GameMain).
 *
 * GameMain measures the viewport and the game's natural layout height, then
 * asks this module whether the zoom should change. Keeping the decision
 * side-effect free lets it be unit tested with bun test — this loop is the
 * most regression-prone piece of the game shell (it must fill the slot
 * completely, never shrink long panels into unreadable sizes, and never
 * overshoot the viewport).
 */

/** Never scale below this, no matter how tall the content is. */
export const MIN_FIT_ZOOM = 0.5;
/** Never scale beyond this, no matter how tall the screen is. */
export const MAX_ZOOM = 2.2;
/** Shrink only when content exceeds the available space by this margin (px). */
export const OVERFLOW_SLACK_PX = 2;
/** Spare room smaller than this counts as "already full" (px). */
export const FILL_SLACK_PX = 2;
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
  const exactFit = avail / natural;

  // Overflow: shrink exactly into the available space, but never below
  // MIN_FIT_ZOOM (documented floor — extreme overflow clips by design).
  if (scaled > avail + OVERFLOW_SLACK_PX) {
    const next = Math.max(MIN_FIT_ZOOM, exactFit);
    return next < zoom - ZOOM_EPSILON ? { next } : null;
  }

  // Spare room: jump straight to the exact fill zoom so the game fills the
  // whole slot — no black band left at the bottom. The width cap still
  // applies (it only binds on extreme aspect ratios). Both branches land
  // inside the ±FILL_SLACK_PX dead zone, so the loop converges immediately.
  if (scaled < avail - FILL_SLACK_PX && zoom < widthTarget - ZOOM_EPSILON) {
    const next = Math.min(widthTarget, exactFit);
    return next > zoom + ZOOM_EPSILON ? { next } : null;
  }

  return null;
}
