/**
 * Wikipedia article-title prediction for archive cars. Pure string logic —
 * imported by both the client (slug keys) and the Convex seeding action
 * (server-side resolution), so both sides always agree on cache keys.
 */

export function wikiTitle(brand: string, model: string): string {
  if (brand === "BMW M") return `BMW ${model}`;
  if (brand === "Audi Sport") return `Audi ${model}`;
  if (brand === "Mercedes-AMG") {
    return `Mercedes-AMG ${model.replace(/^AMG\s+/i, "")}`;
  }
  return `${brand} ${model}`;
}

/** Candidate article titles for one car: the full title, then progressively
 *  trimmed base-model variants ("Toyota Chaser Tourer V" → "Toyota Chaser
 *  Tourer" → "Toyota Chaser") — variant/trim-level articles often don't
 *  exist, but the base-model article's lead photo is the right car. Capped
 *  at 3 to keep batches small. */
export function titleCandidates(brand: string, model: string): string[] {
  const full = wikiTitle(brand, model);
  const tokens = full.split(/\s+/);
  const out = [full];
  while (tokens.length > 2 && out.length < 3) {
    tokens.pop();
    out.push(tokens.join(" "));
  }
  return out;
}

/** Wikipedia titles use underscores; disambiguation parens never match. */
export function wikiSlug(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*/g, "").trim().replace(/\s+/g, "_");
}

/** The catalog cache key for a car: the slug-collapsed primary title
 *  candidate. Both the seeder and the client derive it identically. */
export function carKey(car: { brand: string; model: string }): string {
  return asciiSlug(titleCandidates(car.brand, car.model)[0] ?? "");
}

/** Deterministic slug → unique-catalog-key index for a car list. Naive
 *  title keys collide across generations sharing a name (Corvette C7 ZR1 vs
 *  C6 ZR1, 488 GTB vs 488 GTB 2020), which would serve one photo to two
 *  cars — colliding titles get their unique car slug appended instead.
 *  Needs only the full car list + each car, so client and seeder compute
 *  identical indexes. */
export function carKeyIndex(
  cars: { brand: string; model: string; slug: string }[],
): Record<string, string> {
  const naive = new Map<string, number>();
  for (const car of cars) {
    const key = carKey(car);
    naive.set(key, (naive.get(key) ?? 0) + 1);
  }
  const index: Record<string, string> = {};
  for (const car of cars) {
    const key = carKey(car);
    index[car.slug] = (naive.get(key) ?? 0) > 1 ? `${key}_${car.slug}` : key;
  }
  return index;
}

/** ASCII-safe cache key for a title. Convex rejects non-ASCII object field
 *  names ("Murciélago", "4x4²" all appear in real model names), so catalog
 *  keys are NFKD-normalized (é→e, ²→2) and stripped to printable ASCII.
 *  Raw Unicode titles are kept for the Wikipedia lookups themselves — the
 *  real article titles use these characters. */
export function asciiSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks left by NFKD
    .replace(/[^\x20-\x7E]/g, "") // any remaining non-printable-ASCII
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

/** Whether a cache key is ASCII-safe (survives Convex object-field rules). */
export function isAsciiKey(key: string): boolean {
  return /^[\x21-\x7E]+$/.test(key);
}
