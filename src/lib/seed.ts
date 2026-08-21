/** Deterministic FNV-1a hash so each car/view always gets the same look. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface Palette {
  hue: number;
  hue2: number;
  from: string;
  to: string;
  glow: string;
  line: string;
}

/** Build a unique, stable color palette from a seed (car slug + view). */
export function paletteFromSeed(seed: string, variant = 0): Palette {
  const hash = hashString(`${seed}:${variant}`);
  const hue = hash % 360;
  const hue2 = (hue + 46 + (variant % 5) * 24) % 360;
  const accentHue = (hue + 210) % 360;

  return {
    hue,
    hue2,
    from: `hsl(${hue} 42% 15%)`,
    to: `hsl(${hue2} 48% 6%)`,
    glow: `hsl(${accentHue} 80% 52% / 0.55)`,
    line: `hsl(${accentHue} 80% 62% / 0.7)`,
  };
}
