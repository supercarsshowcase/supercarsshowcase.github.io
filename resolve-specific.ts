import { CARS } from "./src/data/cars";
import { getCarImage } from "./src/data/images";

const sleep = (ms: number) => new Promise((s) => setTimeout(s, ms));

// The most specific Wikipedia article title for each duplicate car, so each
// trim resolves to its own lead image instead of the base model's.
const SPECIFIC_TITLE: Record<string, string> = {
  // Bugatti
  "bugatti-veyron-super-sport": "Bugatti Veyron Super Sport",
  "bugatti-chiron-sport": "Bugatti Chiron Sport",
  "bugatti-chiron-super-sport-300": "Bugatti Chiron Super Sport 300+",
  "bugatti-la-voiture-noire": "Bugatti La Voiture Noire",
  // Mercedes-AMG
  "mercedes-amg-gt-r": "Mercedes-AMG GT R",
  "mercedes-amg-gt-black-series": "Mercedes-AMG GT Black Series",
  "mercedes-amg-gt-63-s-e-performance": "Mercedes-AMG GT 63 S E Performance",
  // BMW M
  "bmw-m3-e46-csl": "BMW M3 CSL",
  "bmw-m3-cs": "BMW M3 CS",
  "bmw-m4-csl": "BMW M4 CSL",
  "bmw-m5-cs": "BMW M5 CS",
  // Lamborghini
  "lamborghini-countach-lpi-800-4": "Lamborghini Countach LPI 800-4",
  "lamborghini-aventador-svj": "Lamborghini Aventador SVJ",
  "lamborghini-huracan-sto": "Lamborghini Huracán STO",
  // Porsche
  "porsche-911-dakar": "Porsche 911 Dakar",
  "porsche-911-s-t": "Porsche 911 S/T",
  "porsche-911-speedster": "Porsche 911 Speedster",
  "porsche-911-gt3-rs": "Porsche 911 GT3 RS",
  // McLaren
  "mclaren-765lt": "McLaren 765LT",
  "mclaren-750s": "McLaren 750S",
  // Aston Martin
  "aston-martin-v12-vantage": "Aston Martin V12 Vantage",
  // Koenigsegg
  "koenigsegg-one-1": "Koenigsegg One:1",
  "koenigsegg-jesko-absolut": "Koenigsegg Jesko Absolut",
  // Pagani
  "pagani-zonda-cinque": "Pagani Zonda Cinque",
  "pagani-zonda-hp-barchetta": "Pagani Zonda HP Barchetta",
  "pagani-huayra-bc": "Pagani Huayra BC",
  "pagani-huayra-r": "Pagani Huayra R",
  // Rolls-Royce
  "rolls-royce-black-badge-ghost": "Rolls-Royce Ghost",
  // Bentley
  "bentley-continental-gt-speed": "Bentley Continental GT Speed",
  "bentley-continental-supersports": "Bentley Continental Supersports",
  "bentley-bacalar": "Bentley Bacalar",
  "bentley-batur": "Bentley Batur",
  // Audi
  "audi-r8-gt": "Audi R8 GT",
  "audi-r8-v10-performance": "Audi R8",
  // Jaguar
  "jaguar-f-type-svr": "Jaguar F-Type SVR",
  "jaguar-f-type-r": "Jaguar F-Type R",
  // Maserati
  "maserati-mc20-cielo": "Maserati MC20 Cielo",
  // Rimac
  "rimac-nevera-r": "Rimac Nevera R",
  // Hennessey
  "hennessey-venom-f5-revolution": "Hennessey Venom F5 Revolution",
};

function brandPrefix(brand: string): string {
  if (brand === "BMW M") return "BMW";
  if (brand === "Audi Sport") return "Audi";
  return brand;
}

function specificTitle(slug: string, brand: string, model: string): string {
  return SPECIFIC_TITLE[slug] ?? `${brandPrefix(brand)} ${model}`;
}

// Batched pageimages (returns real lead-image thumbnails only).
async function fetchLeadImages(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 40) {
    const chunk = titles.slice(i, i + 40);
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
        titles: chunk.join("|"),
      }).toString();
    let d: any;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "SupercarsShowcase/1.0" }, signal: AbortSignal.timeout(25000) });
      d = await r.json();
    } catch {
      d = {};
    }
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
    for (const t of chunk) {
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
    await sleep(200);
  }
  return out;
}

// Find cars that currently share a photo.
const byUrl = new Map<string, (typeof CARS)[number][]>();
for (const car of CARS) {
  const u = getCarImage(car);
  const list = byUrl.get(u) ?? [];
  list.push(car);
  byUrl.set(u, list);
}
const dupGroups = [...byUrl.values()].filter((l) => l.length > 1);
const dupCars = dupGroups.flat();

console.error(`Resolving specific titles for ${dupCars.length} duplicate cars...`);
const titles = dupCars.map((c) => specificTitle(c.slug, c.brand, c.model));
const leads = await fetchLeadImages([...new Set(titles)]);

// Build final map: prefer specific lead image when it differs, else keep base.
const resolved = new Map<string, string>();
const used = new Set<string>();
const failed: string[] = [];

for (const car of CARS) {
  const base = getCarImage(car);
  const spec = dupCars.includes(car) ? leads.get(specificTitle(car.slug, car.brand, car.model)) : undefined;
  let chosen = base;
  if (spec && spec !== base) {
    chosen = spec;
  }
  resolved.set(car.slug, chosen);
  used.add(chosen);
  if (!chosen) failed.push(car.slug);
}

// Duplicate check on final result
const dupCheck = new Map<string, string[]>();
for (const car of CARS) {
  const u = resolved.get(car.slug) ?? "";
  const list = dupCheck.get(u) ?? [];
  list.push(car.slug);
  dupCheck.set(u, list);
}
const remaining = [...dupCheck.entries()].filter(([, l]) => l.length > 1);

let out = "";
out += "=== CAR_IMAGES ===\n";
for (const car of CARS) {
  out += `  "${car.slug}": "${resolved.get(car.slug) ?? ""}",\n`;
}
out += "=== FAILED ===\n" + (failed.join("\n") || "(none)") + "\n";
out += "=== REMAINING_DUPLICATES ===\n";
if (remaining.length === 0) out += "(none)\n";
for (const [u, l] of remaining) out += `${l.join(", ")}\n  ${u}\n`;
out += `TOTALS: ${[...resolved.values()].filter(Boolean).length}/${CARS.length} cars, ${remaining.length} remaining duplicate groups\n`;

await Bun.write("/tmp/car-images-out.txt", out);
console.error("DONE");
