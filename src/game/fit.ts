/**
 * Site-wide UI zoom policy — the single knob for the whole website.
 *
 * Every page (landing, garage, car detail, game, auth, admin) renders at
 * exactly the browser's own zoom level: no page or component applies any
 * scale of its own. SITE_ZOOM is written to the `--site-zoom` CSS variable
 * at boot (src/main.tsx) and applied to #root in src/index.css; the shell,
 * game root and chat rail divide their viewport-unit heights by it so
 * nothing overflows the real viewport.
 *
 * Earlier builds magnified the game UI on wide screens (transform scale,
 * then CSS zoom, up to 2.2×) while the rest of the site stayed natural —
 * that mismatch is gone. To scale the entire site (e.g. 1.1), change
 * SITE_ZOOM here and everything follows.
 */

/** The single site-wide zoom factor. 1 = natural size = browser zoom 100%. */
export const SITE_ZOOM = 1;

/**
 * The game shell's zoom for a given window width. The game inherits the
 * site zoom and adds nothing of its own; kept as a function so GameMain and
 * ChatPanel keep their existing plumbing.
 */
export function gameZoom(_width: number): number {
  return SITE_ZOOM;
}

/**
 * Guard the zoom factor used in viewport math: viewport-unit heights ignore
 * ancestor `zoom`, so every such height must be divided by the TOTAL
 * effective zoom (site zoom × game zoom). A non-finite or non-positive
 * factor would make the division a no-op or infinite — fall back to 1.
 */
function safeZoom(zoom: number): number {
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/**
 * Pre-zoom min-height that lands at EXACTLY one real viewport once scaled
 * by `zoom` (× zoom = 100dvh — no dead band, no overflow).
 */
export function vpFill(zoom: number): string {
  return `calc(100dvh / ${safeZoom(zoom)})`;
}

/**
 * Pre-zoom max-height for rails (sidebar, chat) that must fit inside one
 * real viewport: vpFill minus the game root's 0.5rem×2 padding.
 */
export function vpCap(zoom: number): string {
  return `calc(100dvh / ${safeZoom(zoom)} - 1rem)`;
}
