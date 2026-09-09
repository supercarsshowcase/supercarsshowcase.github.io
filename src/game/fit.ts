/**
 * Deterministic UI zoom for the game shell (GameMain).
 *
 * The zoom is a pure function of the window width — no content measurement
 * and no feedback loop. The previous implementation scaled with
 * `transform: scale()` and re-measured itself in a loop; transform scale
 * doesn't affect layout, so the shell's scroll container couldn't see the
 * scaled height (content clipped, unreachable) and the measurement loop
 * oscillated. CSS `zoom` scales layout itself, so one static decision is
 * enough — and switching tabs can never resize the UI.
 */

/** Viewport width at which the game renders at its natural size (zoom 1). */
export const DESIGN_WIDTH = 1180;
/** Never zoom beyond this, no matter how wide the screen is. */
export const MAX_ZOOM = 2.2;
/** Below this width the layout stacks (single column, chat hidden). */
export const MOBILE_BREAKPOINT = 768;
/** Fixed zoom on phones so text stays readable (stacked layout scrolls). */
export const MOBILE_ZOOM = 1.3;

/**
 * The UI zoom for a given window width. Always ≥ 1 above the mobile
 * breakpoint (never shrinks the UI below natural size) and capped at
 * MAX_ZOOM; phones get the fixed MOBILE_ZOOM boost.
 */
export function gameZoom(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  if (width < MOBILE_BREAKPOINT) return MOBILE_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(1, width / DESIGN_WIDTH));
}
