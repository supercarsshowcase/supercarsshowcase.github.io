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
  return wikiSlug(titleCandidates(car.brand, car.model)[0] ?? "");
}
