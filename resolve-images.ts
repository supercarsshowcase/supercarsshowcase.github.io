import { CARS } from "./src/data/cars";
import { BRANDS } from "./src/data/brands";

// Slugs whose data model doesn't map to the canonical Wikipedia article title.
const TITLE_OVERRIDES: Record<string, string> = {
  // Mercedes-AMG (model already contains "AMG"/"SLS"/"SLR")
  "mercedes-sls-amg": "Mercedes-Benz SLS AMG",
  "mercedes-amg-gt-r": "Mercedes-AMG GT",
  "mercedes-amg-gt-black-series": "Mercedes-AMG GT",
  "mercedes-amg-gt-63-s-4door": "Mercedes-AMG GT 4-Door Coupé",
  "mercedes-amg-c63-s-e-performance": "Mercedes-AMG C 63",
  "mercedes-amg-e63-s": "Mercedes-Benz E-Class",
  "mercedes-amg-g63": "Mercedes-AMG G 63",
  "mercedes-amg-gle-63-s": "Mercedes-Benz GLE-Class",
  "mercedes-slr-mclaren": "Mercedes-Benz SLR McLaren",
  "mercedes-amg-gt-63-s-e-performance": "Mercedes-AMG GT 4-Door Coupé",
  // BMW M (article titles drop the trim suffix)
  "bmw-m3-e46-csl": "BMW M3",
  "bmw-m3": "BMW M3",
  "bmw-m3-cs": "BMW M3",
  "bmw-m4": "BMW M4",
  "bmw-m4-csl": "BMW M4",
  "bmw-m5": "BMW M5",
  "bmw-m5-cs": "BMW M5",
  "bmw-m8-competition": "BMW M8",
  "bmw-i8": "BMW i8",
  // Audi Sport
  "audi-r8-v10": "Audi R8",
  "audi-r8-v10-performance": "Audi R8",
  "audi-r8-gt": "Audi R8",
  "audi-rs6-avant": "Audi RS 6",
  "audi-rs7-sportback": "Audi RS 7",
  "audi-rs3": "Audi RS 3",
  "audi-e-tron-gt-rs": "Audi e-tron GT",
  "audi-rs-q8": "Audi RS Q8",
  // Trim-level variants that don't have their own redirects
  "lamborghini-countach": "Lamborghini Countach",
  "lamborghini-aventador": "Lamborghini Aventador",
  "lamborghini-huracan": "Lamborghini Huracán",
  "lamborghini-sian-fkp-37": "Lamborghini Sián",
  "lamborghini-countach-lpi-800-4": "Lamborghini Countach",
  "porsche-911-gt2-rs": "Porsche 911 GT2",
  "porsche-911-turbo-s": "Porsche 911 Turbo",
  "porsche-911-gt3-rs": "Porsche 911 GT3",
  "porsche-911-speedster": "Porsche 911",
  "pagani-zonda-c12": "Pagani Zonda",
  "pagani-zonda-cinque": "Pagani Zonda",
  "pagani-huayra-bc": "Pagani Huayra",
  "pagani-zonda-hp-barchetta": "Pagani Zonda",
  "jaguar-f-type-svr": "Jaguar F-Type",
  "jaguar-f-type-r": "Jaguar F-Type",
  "jaguar-xkr-s": "Jaguar XKR",
  "maserati-granturismo-trofeo": "Maserati GranTurismo",
  "maserati-ghibli-trofeo": "Maserati Ghibli",
  "maserati-quattroporte-trofeo": "Maserati Quattroporte",
  "maserati-mc20-cielo": "Maserati MC20",
  "lotus-exige-sport-410": "Lotus Exige",
  "lotus-esprit-v8": "Lotus Esprit",
  "rolls-royce-black-badge-ghost": "Rolls-Royce Ghost",
  "bentley-continental-gt-speed": "Bentley Continental GT",
  "bentley-continental-supersports": "Bentley Continental GT",
  "hennessey-venom-f5-revolution": "Hennessey Venom F5",
  "bugatti-chiron-sport": "Bugatti Chiron",
  "lamborghini-huracan-sto": "Lamborghini Huracán",
  "porsche-911-dakar": "Porsche 911",
  "porsche-718-cayman-gt4-rs": "Porsche 718 Cayman GT4",
  "porsche-panamera-turbo-s": "Porsche Panamera",
  "porsche-911-s-t": "Porsche 911",
  "aston-martin-v12-vantage": "Aston Martin Vantage",
  "pagani-huayra-r": "Pagani Huayra",
  "rolls-royce-wraith": "Rolls-Royce Wraith (2013)",
  "bentley-flying-spur": "Bentley Flying Spur (2005)",
  "bentley-mulsanne": "Bentley Mulsanne (2010)",
  "audi-rs-q8": "Audi Q8",
  "jaguar-project-8": "Jaguar XE",
  "rimac-nevera-r": "Rimac Nevera",
};

function titleFor(brand: string, model: string): string {
  if (brand === "BMW M") return `BMW ${model.split(" ")[0]}`;
  if (brand === "Audi Sport") return `Audi ${model}`;
  if (brand === "Mercedes-AMG") {
    return `Mercedes-AMG ${model.replace(/^AMG\s+/i, "")}`;
  }
  return `${brand} ${model}`.replace(/_/g, " ");
}

function candidateTitle(slug: string, brand: string, model: string): string {
  return TITLE_OVERRIDES[slug] ?? titleFor(brand, model);
}

async function fetchBatch(titles: string[]): Promise<Map<string, string>> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "960",
      redirects: "1",
      format: "json",
      origin: "*",
      titles: titles.join("|"),
    }).toString();

  const r = await fetch(url);
  const d: any = await r.json();

  const pagesByTitle = new Map<string, string>();
  for (const p of Object.values<any>(d?.query?.pages ?? {})) {
    if (typeof p?.thumbnail?.source === "string") {
      pagesByTitle.set(p.title, p.thumbnail.source.split("?")[0]);
    }
  }
  const redirects = new Map<string, string>(
    (d?.query?.redirects ?? []).map((x: any) => [x.from, x.to]),
  );
  const normalized = new Map<string, string>(
    (d?.query?.normalized ?? []).map((x: any) => [x.from, x.to]),
  );

  const out = new Map<string, string>();
  for (const t of titles) {
    let cur = normalized.get(t) ?? t;
    const seen = new Set<string>([cur]);
    while (redirects.has(cur)) {
      cur = redirects.get(cur)!;
      if (seen.has(cur)) break;
      seen.add(cur);
    }
    const src = pagesByTitle.get(cur);
    if (src) out.set(t, src);
  }
  return out;
}

// Resolve unique candidate titles in batches of 50.
const titleToSlug = new Map<string, string>();
for (const car of CARS) {
  titleToSlug.set(candidateTitle(car.slug, car.brand, car.model), car.slug);
}
const titles = [...titleToSlug.keys()];

const resolved = new Map<string, string>();
for (let i = 0; i < titles.length; i += 50) {
  const chunk = titles.slice(i, i + 50);
  const batch = await fetchBatch(chunk);
  for (const [t, src] of batch) resolved.set(t, src);
  await new Promise((s) => setTimeout(s, 250));
}

const carImages: Record<string, string> = {};
const failedCars: string[] = [];
for (const car of CARS) {
  const src = resolved.get(candidateTitle(car.slug, car.brand, car.model));
  if (src) carImages[car.slug] = src;
  else failedCars.push(`${car.slug} | ${car.brand} ${car.model}`);
}

// Brand images use the first resolvable car photo for that marque.
const brandImages: Record<string, string> = {};
for (const b of BRANDS) {
  const first = CARS.find((c) => c.brand === b.name && carImages[c.slug]);
  if (first) brandImages[b.name] = carImages[first.slug];
}

console.log("=== CAR_IMAGES ===");
for (const [k, v] of Object.entries(carImages)) {
  console.log(`  "${k}": "${v}",`);
}
console.log("=== BRAND_IMAGES ===");
for (const [k, v] of Object.entries(brandImages)) {
  console.log(`  "${k}": "${v}",`);
}
console.log("=== FAILED CARS ===");
console.log(failedCars.join("\n") || "(none)");
console.log(
  `\nTOTALS: ${Object.keys(carImages).length}/${CARS.length} cars, ${Object.keys(brandImages).length}/${BRANDS.length} brands`,
);
