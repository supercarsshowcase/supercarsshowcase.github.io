import { CARS } from "./src/data/cars";
import { getCarImage } from "./src/data/images";

const sleep = (ms: number) => new Promise((s) => setTimeout(s, ms));
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const WIKI = "https://en.wikipedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/w/api.php";

const TITLE_OVERRIDES: Record<string, string> = {
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
  "bmw-m3-e46-csl": "BMW M3",
  "bmw-m3": "BMW M3",
  "bmw-m3-cs": "BMW M3",
  "bmw-m4": "BMW M4",
  "bmw-m4-csl": "BMW M4",
  "bmw-m5": "BMW M5",
  "bmw-m5-cs": "BMW M5",
  "bmw-m8-competition": "BMW M8",
  "bmw-i8": "BMW i8",
  "audi-r8-v10": "Audi R8",
  "audi-r8-v10-performance": "Audi R8",
  "audi-r8-gt": "Audi R8",
  "audi-rs6-avant": "Audi RS 6",
  "audi-rs7-sportback": "Audi RS 7",
  "audi-rs3": "Audi RS 3",
  "audi-e-tron-gt-rs": "Audi e-tron GT",
  "audi-rs-q8": "Audi RS Q8",
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
  if (brand === "BMW M") return `BMW ${model}`;
  if (brand === "Audi Sport") return `Audi ${model}`;
  if (brand === "Mercedes-AMG") return `Mercedes-AMG ${model.replace(/^AMG\s+/i, "")}`;
  return `${brand} ${model}`;
}
function candidateTitle(slug: string, brand: string, model: string): string {
  return TITLE_OVERRIDES[slug] ?? titleFor(brand, model);
}

interface Img { file: string; url: string; w: number; h: number; }

const EXCLUDE =
  /logo|emblem|shield|coat of arms|flag|badge|wordmark|banner|map|diagram|interior|dashboard|cockpit|engine|signature|autograph|grille|headlight|taillight|museum|chassis|suspension|exhaust|wheel|brake|gearbox|transmission/i;

async function fetchJson(base: string, params: Record<string, string>, attempt = 0): Promise<any> {
  const url = base + "?" + new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
  let r: Response;
  try {
    r = await fetch(url, { headers: { "User-Agent": "SupercarsShowcase/1.0" }, signal: AbortSignal.timeout(20000) });
  } catch {
    if (attempt < 2) { await sleep(800 * (attempt + 1)); return fetchJson(base, params, attempt + 1); }
    return {};
  }
  if (r.status === 429) {
    if (attempt < 3) { await sleep(1500 * (attempt + 1)); return fetchJson(base, params, attempt + 1); }
    return {};
  }
  if (!r.ok) return {};
  return r.json();
}

async function qidsForTitles(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const d = await fetchJson(WIKI, { action: "query", prop: "pageprops", pp_prop: "wikibase_item", redirects: "1", titles: titles.join("|") });
  const redirects = new Map((d?.query?.redirects ?? []).map((x: any) => [x.from, x.to]));
  const normalized = new Map((d?.query?.normalized ?? []).map((x: any) => [x.from, x.to]));
  const pageQid = new Map<string, string>();
  for (const p of Object.values<any>(d?.query?.pages ?? {})) if (p.pageprops?.wikibase_item) pageQid.set(p.title, p.pageprops.wikibase_item);
  for (const t of titles) {
    let cur = normalized.get(t) ?? t;
    while (redirects.has(cur)) cur = redirects.get(cur)!;
    const qid = pageQid.get(cur);
    if (qid) out.set(t, qid);
  }
  return out;
}

async function commonsCatForQids(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const d = await fetchJson(WIKIDATA, { action: "wbgetentities", ids: qids.join("|"), props: "claims" });
  for (const [qid, ent] of Object.entries<any>(d?.entities ?? {})) {
    const cat = ent?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
    if (typeof cat === "string") out.set(qid, cat);
  }
  return out;
}

async function grabFiles(title: string, limit: string): Promise<Img[]> {
  const d = await fetchJson(COMMONS, {
    action: "query",
    generator: "categorymembers",
    gcmtitle: title,
    gcmtype: "file",
    gcmlimit: limit,
    prop: "imageinfo",
    iiprop: "url|size",
    iiurlwidth: "960",
  });
  const out: Img[] = [];
  for (const p of Object.values<any>(d?.query?.pages ?? {})) {
    const info = p?.imageinfo?.[0];
    if (!info?.thumburl) continue;
    out.push({ file: p?.title ?? "", url: info.thumburl.split("?")[0], w: info.thumbwidth ?? 0, h: info.thumbheight ?? 0 });
  }
  return out;
}

async function categoryFiles(cat: string): Promise<Img[]> {
  const catTitle = cat.startsWith("Category:") ? cat : `Category:${cat}`;
  const direct = await grabFiles(catTitle, "100");
  const seen = new Set(direct.map((x) => x.url));
  const all = [...direct];

  if (direct.length < 5) {
    const d = await fetchJson(COMMONS, { action: "query", list: "categorymembers", cmtitle: catTitle, cmtype: "subcat", cmlimit: "30" });
    const subcats = (d?.query?.categorymembers ?? []).map((x: any) => x.title).slice(0, 6);
    for (const sub of subcats) {
      const imgs = await grabFiles(sub, "30");
      for (const img of imgs) if (!seen.has(img.url)) { seen.add(img.url); all.push(img); }
    }
  }
  return all;
}

const STOP = new Set(["the","a","an","of","and","for","with","in","on","grand","sports","car","cars","coupe","sport","competition","type"]);
function tokensFor(car: (typeof CARS)[number]): string[] {
  const words = [...car.brand.split(/\s+/), ...car.model.split(/\s+/)]
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w));
  return [...new Set(words)];
}
function score(file: string, car: (typeof CARS)[number]): number {
  const f = file.toLowerCase();
  let s = 0;
  for (const t of tokensFor(car)) if (f.includes(t)) s += 2;
  if (f.includes(String(car.year))) s += 8;
  const m = f.match(/(19|20)\d{2}/);
  if (m && Math.abs(parseInt(m[1]) - car.year) <= 1) s += 2;
  return s;
}
function sortImgs(imgs: Img[]): Img[] {
  return [...imgs].sort((a, b) => {
    const aJ = a.file.toLowerCase().endsWith(".jpg") ? 0 : 1;
    const bJ = b.file.toLowerCase().endsWith(".jpg") ? 0 : 1;
    if (aJ !== bJ) return aJ - bJ;
    const aL = a.w >= a.h ? 0 : 1;
    const bL = b.w >= b.h ? 0 : 1;
    if (aL !== bL) return aL - bL;
    return b.w * b.h - a.w * a.h;
  });
}

// ── Main ──────────────────────────────────────────────────────────────
const byUrl = new Map<string, (typeof CARS)[number][]>();
for (const car of CARS) { const u = getCarImage(car); const l = byUrl.get(u) ?? []; l.push(car); byUrl.set(u, l); }
const dupGroups = [...byUrl.values()].filter((l) => l.length > 1);
const dupCars = dupGroups.flat();
console.error(`Duplicate cars: ${dupCars.length} in ${dupGroups.length} groups`);

const dupTitles = [...new Set(dupCars.map((c) => candidateTitle(c.slug, c.brand, c.model)))];
console.error("Resolving Commons categories...");
const titleQid = await qidsForTitles(dupTitles);
const qidCat = await commonsCatForQids([...titleQid.values()]);
const titleCat = new Map<string, string>();
for (const [t, qid] of titleQid) { const cat = qidCat.get(qid); if (cat) titleCat.set(t, cat); }

const catForCar = new Map<string, string>();
for (const car of dupCars) catForCar.set(car.slug, titleCat.get(candidateTitle(car.slug, car.brand, car.model)) ?? "");

// Load cached files if present (resume support).
const cachePath = "/tmp/cat-files.json";
let cache: Record<string, Img[]> = {};
try { cache = await Bun.file(cachePath).json(); } catch { cache = {}; }

const uniqueCats = [...new Set([...catForCar.values()].filter(Boolean))];
console.error(`Fetching files for ${uniqueCats.length} categories...`);
const catFiles = new Map<string, Img[]>(Object.entries(cache));
let done = 0;
const queue = uniqueCats.filter((c) => !catFiles.has(c));
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const cat = queue.shift()!;
      catFiles.set(cat, sortImgs(await categoryFiles(cat)));
      done++;
      if (done % 5 === 0) console.error(`categories ${done}/${uniqueCats.length}`);
      // persist incrementally
      try { await Bun.write(cachePath, JSON.stringify(Object.fromEntries(catFiles))); } catch {}
      await sleep(100);
    }
  }),
);
await Bun.write(cachePath, JSON.stringify(Object.fromEntries(catFiles)));

// Assign distinct images per group.
const resolved = new Map<string, string>();
const failed: string[] = [];
for (const group of dupGroups) {
  const pool = new Map<string, Img>();
  for (const car of group) for (const img of catFiles.get(catForCar.get(car.slug) ?? "") ?? []) pool.set(img.url, img);
  const imgs = sortImgs([...pool.values()]);
  if (imgs.length === 0) { for (const c of group) failed.push(c.slug); continue; }
  const byYear = [...group].sort((a, b) => a.year - b.year);
  const used = new Set<string>();
  for (const car of byYear) {
    const ranked = [...imgs].map((img) => ({ img, s: score(img.file, car) })).sort((a, b) => b.s - a.s);
    let chosen = ranked[0].img;
    for (const { img } of ranked) if (!used.has(img.url)) { chosen = img; break; }
    used.add(chosen.url);
    resolved.set(car.slug, chosen.url);
  }
}

const finalMap = new Map<string, string>();
for (const car of CARS) finalMap.set(car.slug, resolved.get(car.slug) ?? getCarImage(car));

const dupCheck = new Map<string, string[]>();
for (const car of CARS) { const u = finalMap.get(car.slug) ?? ""; const l = dupCheck.get(u) ?? []; l.push(car.slug); dupCheck.set(u, l); }
const remaining = [...dupCheck.entries()].filter(([, l]) => l.length > 1);

let out = "";
out += "=== CAR_IMAGES ===\n";
for (const car of CARS) out += `  "${car.slug}": "${finalMap.get(car.slug) ?? ""}",\n`;
out += "=== FAILED ===\n" + (failed.join("\n") || "(none)") + "\n";
out += "=== REMAINING_DUPLICATES ===\n";
if (remaining.length === 0) out += "(none)\n";
for (const [u, l] of remaining) out += `${l.join(", ")}\n  ${u}\n`;
out += `TOTALS: ${[...finalMap.values()].filter(Boolean).length}/${CARS.length} cars, ${remaining.length} remaining duplicate groups\n`;

await Bun.write("/tmp/car-images-out.txt", out);
console.error("DONE");
