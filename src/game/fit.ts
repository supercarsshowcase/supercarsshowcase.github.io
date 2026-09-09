/**
 * UI zoom policy for the game shell (GameMain).
 *
 * The game renders at its natural size — exactly the scale the rest of the
 * site uses at browser zoom 100%. Earlier builds magnified the UI on wide
 * screens (up to 2.2×, first via transform scale then CSS zoom), which made
 * the game look zoomed-in next to every other page; that magnification is
 * gone and the shell applies `zoom: 1` everywhere.
 *
 * `gameZoom` stays as the single knob: if the scale policy ever changes
 * again, change it here and every tab follows.
 */

/**
 * The UI zoom for a given window width. Deliberately 1 (natural size) at
 * every width — the game matches the browser's own zoom level.
 */
export function gameZoom(_width: number): number {
  return 1;
}
