// Relative import: also typechecked by the Convex toolchain (no "@/") alias.
import type { Car, Category } from "../lib/types";

/**
 * The 900+ car expansion. Each shard exports compact tuples; this module
 * expands them into full Car objects with derived transmission, body style,
 * production window and a seeded description — so 900 rows stay reviewable
 * without repeating 16 fields per car.
 *
 * PHOTO POLICY (user requirement: no two cars may share a photo):
 * - Cars whose slug matches an existing hand-verified key in images.ts
 *   automatically get that real photo via getCarImage (the expansion
 *   deliberately reuses those exact slugs — never a guessed filename).
 * - Every other new car intentionally has NO static photo: getCarImage
 *   returns "" and SmartImage renders its unique generated scene (seeded by
 *   the car's slug), so no photo is ever duplicated or fabricated.
 */

// ── Engine code → display string ─────────────────────────────────────────────

// NOTE: no Record<string,string> annotation — the literal type IS the union,
// so ExtraSpec's `keyof typeof ENGINES` makes an unknown engine code a
// compile error instead of a silent `engine: undefined` at runtime.
const ENGINES = {
  I3NA: "I3 Naturally-Aspirated",
  I3T: "I3 Turbo",
  I3SC: "I3 Supercharged",
  I3H: "I3 Hybrid",
  I4NA: "I4 Naturally-Aspirated",
  I4T: "I4 Turbo",
  I4SC: "I4 Supercharged",
  I4H: "I4 Turbo Hybrid",
  I4D: "I4 Turbo-Diesel",
  I5T: "I5 Turbo",
  I5NA: "I5 Naturally-Aspirated",
  I6NA: "I6 Naturally-Aspirated",
  I6T: "I6 Turbo",
  I6D: "I6 Turbo-Diesel",
  I6SC: "I6 Supercharged",
  I6TT: "I6 Twin-Turbo",
  I8NA: "I8 Naturally-Aspirated",
  I8SC: "I8 Supercharged",
  ROT: "Rotary Twin-Turbo",
  F4: "Flat-4",
  F4NA: "Flat-4 Naturally-Aspirated",
  F6NA: "Flat-6 Naturally-Aspirated",
  F6T: "Flat-6 Turbo",
  F4T: "Flat-4 Turbo",
  F6TT: "Flat-6 Twin-Turbo",
  F12NA: "Flat-12 Naturally-Aspirated",
  V4H: "V4 Turbo Hybrid (Racing)",
  V6NA: "V6 Naturally-Aspirated",
  V6T: "V6 Turbo",
  V6TT: "V6 Twin-Turbo",
  V6D: "V6 Turbo-Diesel",
  V6SC: "V6 Supercharged",
  V6H: "V6 Twin-Turbo Hybrid",
  V8NA: "V8 Naturally-Aspirated",
  V8T: "V8 Turbo",
  V8TT: "V8 Twin-Turbo",
  V8D: "V8 Turbo-Diesel",
  V8SC: "V8 Supercharged",
  V8H: "V8 Twin-Turbo Hybrid",
  V10NA: "V10 Naturally-Aspirated",
  V10H: "V10 Hybrid",
  V10TT: "V10 Twin-Turbo",
  V10SC: "V10 Supercharged",
  V12NA: "V12 Naturally-Aspirated",
  V12T: "V12 Twin-Turbo",
  V12QT: "V12 Quad-Turbo",
  V12H: "V12 Hybrid",
  V16NA: "V16 Naturally-Aspirated",
  W16: "W16 Quad-Turbo",
  W12T: "W12 Twin-Turbo",
  V16H: "V16 Hybrid",
  EV1: "Single Electric Motor",
  EV2: "Dual Electric Motors",
  EV3: "Tri Electric Motors",
} as const;

const DRIVE_NAMES = ["Rear-Wheel Drive", "All-Wheel Drive", "Front-Wheel Drive"] as const;

/** Compact spec tuple: [slug, model, year, category, priceUSD, hp, Nm, 0-100, top, kg, drive, engine] */
export type ExtraSpec = readonly [
  slug: string,
  model: string,
  year: number,
  category: Category,
  priceUSD: number,
  hp: number,
  nm: number,
  acc: number,
  top: number,
  kg: number,
  drive: 0 | 1 | 2,
  eng: keyof typeof ENGINES,
];

// ── Derived fields ───────────────────────────────────────────────────────────

const BODY_BY_CATEGORY: Record<Category, string> = {
  Hypercar: "Coupé",
  Supercar: "Coupé",
  "Track Car": "Coupé",
  "Grand Tourer": "Coupé",
  "Sports Car": "Coupé",
  Luxury: "Sedan",
  SUV: "SUV",
  Sedan: "Sedan",
  Roadster: "Roadster",
  Classic: "Coupé",
  Electric: "Coupé",
};

/** Model-name keywords that flip the default body style of their category. */
const BODY_OVERRIDES: [RegExp, string][] = [
  [/roadster|speedster|barchetta|elise|elan|mx-5|miata|brz|86|s2000|z4|slk|boxster|montu/i, "Roadster"],
  [/spyder|spider|cabriolet|volante|convertible|drophead|gts cab/i, "Convertible"],
  [/targa/i, "Targa"],
  [/shooting brake|shooting-brake/i, "Shooting Brake"],
  [/avant|touring\b/i, "Wagon"],
  [/pickup|f-150|silverado|ram |hilux|hoggar/i, "Pickup"],
  [/hatch|gti|type r|megane|focus|golf|cooper|500 abarth|puma|fiesta/i, "Hatchback"],
];

function bodyFor(category: Category, model: string): string {
  for (const [re, body] of BODY_OVERRIDES) if (re.test(model)) return body;
  return BODY_BY_CATEGORY[category];
}

function transmissionFor(year: number, eng: string, category: Category): string {
  if (eng.startsWith("EV")) return "Single-Speed";
  if (year < 1990) return "5-Speed Manual";
  if (year < 2000) return "5-Speed Manual";
  if (year < 2006) return "6-Speed Manual";
  if (year < 2014) {
    return category === "Hypercar" || category === "Supercar" || category === "Track Car"
      ? "7-Speed Dual-Clutch"
      : "7-Speed Automatic";
  }
  if (category === "SUV" || category === "Sedan" || category === "Luxury") return "8-Speed Automatic";
  return year < 2020 ? "7-Speed Dual-Clutch" : "8-Speed Dual-Clutch";
}

function productionFor(year: number, category: Category): string {
  if (year >= 2022) return `${year}–present`;
  const span = category === "Classic" ? 5 : 4;
  return `${year}–${year + span}`;
}

// ── Description templates (seeded by slug so they vary without being random) ─

const ERA = (year: number) =>
  year < 1980 ? "vintage-era" : year < 1995 ? "80s-era" : year < 2005 ? "analogue-era" : year < 2015 ? "modern-era" : "current-era";

const TAILS = [
  (b: string) => `A defining machine in ${b}'s history.`,
  (b: string) => `${b} built it to be driven, not parked.`,
  () => `Collectors and drivers rate it equally highly.`,
  () => `Few cars balance theatre and usability this well.`,
  (b: string) => `It remains one of the most recognisable statements ${b} ever made.`,
  () => `Specifications that still hold up against far newer metal.`,
] as const;

function descriptionFor(slug: string, brand: string, model: string, year: number, category: Category, hp: number, top: number): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  const tail = TAILS[Math.abs(h) % TAILS.length](brand);
  const era = ERA(year);
  const lead =
    category === "Classic"
      ? `A ${era} icon, the ${model} dates to ${year} and remains a blueprint for everything ${brand} built after it.`
      : category === "SUV" || category === "Sedan" || category === "Luxury"
        ? `The ${model} brings genuine performance to the ${category.toLowerCase()} class — ${hp} hp in a package designed for daily use.`
        : category === "Electric"
          ? `The ${model} is ${brand}'s ${era} electric flagship, delivering ${hp} hp with instant torque.`
          : `A ${era} ${category.toLowerCase()} from ${brand}, the ${model} pairs ${hp} hp with a ${top} km/h top speed.`;
  return `${lead} ${tail}`;
}

// ── Expansion ────────────────────────────────────────────────────────────────

export function expandCar(brand: string, s: ExtraSpec): Car {
  const [slug, model, year, category, priceUSD, hp, nm, acc, top, kg, drive, eng] = s;
  return {
    slug,
    brand,
    model,
    year,
    category,
    priceUSD,
    engine: ENGINES[eng],
    horsepower: hp,
    torqueNm: nm,
    zeroToHundredKmh: acc,
    topSpeedKmh: top,
    weightKg: kg,
    driveType: DRIVE_NAMES[drive],
    transmission: transmissionFor(year, eng, category),
    bodyStyle: bodyFor(category, model),
    production: productionFor(year, category),
    description: descriptionFor(slug, brand, model, year, category, hp, top),
  };
}
