// Relative import: also typechecked by the Convex toolchain (no "@/") alias.
import { useEffect, useState } from "react";
import type { Car } from "../lib/types";
import { getCarImage, getBrandImage } from "./images";
import { CARS } from "./cars";
import { asciiSlug, carKeyIndex } from "../lib/wikiTitles";

/** Directory of car thumbnails seeded into Convex storage by the admin
 *  seeder. Populated once per session from the app's own backend — the
 *  deterministic, no-external-host tier of the image chain. */
let catalog: Record<string, string> | null = null;
let catalogVersion = 0;
const catalogListeners = new Set<() => void>();

// Convex HTTP actions are served from the site host, not the websocket host.
const CONVEX_SITE = ((import.meta as { env?: Record<string, string> }).env?.VITE_CONVEX_URL ?? "").replace(
  "convex.cloud",
  "convex.site",
);
const thumbUrl = (storageId: string) => `${CONVEX_SITE}/api/thumb/${storageId}`;

/** Swap in the Convex catalog once the query resolves; subscribers re-render.
 *  Defensive: entries whose key violates Convex field-name rules are skipped —
 *  they can never be looked up anyway, and one poisoned row must never break
 *  the rest of the catalog. */
export function setThumbCatalog(
  entries: { key: string; storageId: string }[],
): void {
  const map: Record<string, string> = {};
  for (const e of entries) {
    if (e && typeof e.key === "string" && e.key && e.storageId) {
      map[e.key] = e.storageId; // keys are unique by carKeyIndex
    }
  }
  catalog = map;
  catalogVersion++;
  for (const fn of catalogListeners) fn();
}

// Unique catalog key per car slug (title collisions disambiguated by slug).
const SLUG_TO_KEY = carKeyIndex(CARS);

/** Convex-served thumbnail for a car, if the seeder has resolved one. */
export function catalogCarImage(car: Car): string {
  if (!catalog) return "";
  const id = catalog[SLUG_TO_KEY[car.slug] ?? ""];
  return id ? thumbUrl(id) : "";
}

/** Convex-served image for any catalog key (cars, brand marques). */
export function catalogImageFor(key: string): string {
  if (!catalog || !key) return "";
  const id = catalog[key];
  return id ? thumbUrl(id) : "";
}

/** Subscribe to catalog swaps (used by hooks). */
function subscribeCatalog(fn: () => void): () => void {
  catalogListeners.add(fn);
  return () => {
    catalogListeners.delete(fn);
  };
}

/**
 * Runtime photo enrichment for the archive.
 *
 * The 1000-car expansion deliberately ships no static photo for cars without
 * a hand-verified Wikimedia URL (fabricating filenames just 404s). Those cars
 * rendered the generated-silhouette scene, which reads as "thumbnail not
 * loading". This module fills them in at runtime:
 *
 * - It asks Wikipedia's pageimages API for the lead thumbnail of the car's
 *   article (title rules mirror images.ts carWikiTitle). The API returns the
 *   real image or nothing — URLs are never guessed.
 * - Results cache in localStorage forever and in memory for the session, so
 *   each car costs the network at most once.
 * - Requests batch 40 titles per call and only fire for mounted cars, so the
 *   grid never storms the API.
 * - A car with no Wikipedia photo keeps its unique generated scene — the
 *   designed fallback, never a broken image.
 */

// ── Title prediction (shared with the Convex seeding action) ─────────────────

import { titleCandidates, wikiSlug } from "../lib/wikiTitles";
export { wikiTitle, titleCandidates, wikiSlug } from "../lib/wikiTitles";

// ── Cache ─────────────────────────────────────────────────────────────────────

// v2: the first release flushed the whole inflight queue with a single
// candidate per car, permanently storing "" (no photo) for titles the
// current rules resolve fine. Bumping the key discards those poisoned
// entries so every car re-probes under the improved matching.
const STORAGE_KEY = "carthumbs.v2";
/** Slugified title → thumbnail URL ("" = confirmed no photo). */
const memory = new Map<string, string>();

function loadStorage(): void {
  if (memory.size > 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) if (typeof v === "string") memory.set(k, v);
  } catch {
    // no localStorage (tests/private mode) / corrupt JSON — memory-only
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of memory) obj[k] = v;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // quota / unavailable — enrichment continues from memory
    }
  }, 800);
}

/** Enrichment-only lookup (no static photo): best known thumbnail or "". */
export function cachedEnriched(car: Car): string {
  loadStorage();
  for (const title of titleCandidates(car.brand, car.model)) {
    const hit = memory.get(wikiSlug(title));
    if (hit) return hit;
  }
  return "";
}

/** Best image for a car right now: verified static photo → Convex catalog →
 *  any previously-enriched thumbnail ("" = still unknown, scene stays up). */
export function cachedCarImage(car: Car): string {
  return getCarImage(car) || catalogCarImage(car) || cachedEnriched(car);
}

// ── Subscriptions (hooks re-render when their car resolves) ───────────────────

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>(); // by wikiSlug of title

function subscribe(key: string, fn: Listener): () => void {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(fn);
  listeners.set(key, set);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(key);
  };
}

function notify(keys: string[]): void {
  for (const k of keys) {
    const set = listeners.get(k);
    if (set) for (const fn of set) fn();
  }
}

// ── Batched fetching ──────────────────────────────────────────────────────────

const API = "https://en.wikipedia.org/w/api.php";
const BATCH_TITLES = 40; // API limit is 50 titles; headroom for base-model variants

const inflight = new Set<string>(); // slugs queued or being fetched
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Queue cars whose thumbnail is unknown; a debounced flush batches them. */
export function ensureThumbs(cars: Car[]): void {
  loadStorage();
  const wanted: string[] = [];
  for (const car of cars) {
    if (getCarImage(car) || catalogCarImage(car)) continue; // already served
    for (const title of titleCandidates(car.brand, car.model)) {
      wanted.push(wikiSlug(title));
    }
  }
  queueSlugs(wanted);
}

/** Queue slugs (car candidates, brand marque titles) that have no known
 *  thumbnail yet; a debounced flush batches them. */
function queueSlugs(slugs: string[]): void {
  let added = false;
  for (const slug of slugs) {
    if (memory.has(slug) || inflight.has(slug)) continue;
    inflight.add(slug);
    added = true;
  }
  if (!added || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 150);
}

async function flush(): Promise<void> {
  // Drain in waves: slugs queued while a flush runs join the next wave, so a
  // second timer firing mid-flush neither double-fetches in-flight slugs nor
  // strands late arrivals until some future call.
  while (inflight.size > 0) {
    const queued = [...inflight];
    const misses: string[] = [];
    for (let i = 0; i < queued.length; i += BATCH_TITLES) {
      const batch = queued.slice(i, i + BATCH_TITLES);
      // Consume exactly this batch before fetching, so a remount during the
      // flush can't double-fetch keys that are already in flight.
      for (const slug of batch) inflight.delete(slug);
      try {
        await fetchBatch(batch);
      } catch {
        // network hiccup — leave memory untouched so a later mount retries
      }
      notify(batch);
      misses.push(...batch.filter((s) => memory.get(s) === ""));
    }
    // One search pass per wave (not per batch): the direct pass resolves most
    // titles in bulk; misses are far fewer, so this stays out of the way of
    // the next direct batch instead of head-of-line blocking it.
    try {
      await runSearchFallback(misses);
    } catch {
      // search is best-effort — the generated scene stays the fallback
    }
    if (inflight.size > 0) continue; // requeued slugs join the next wave
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null; // fully drained; rearm on the next enqueue
    }
  }
}

/** Second-chance pass: titles that are not actual article titles on
 *  Wikipedia (trim-level names like "Nissan Qashqai e-Power") get a search
 *  lookup for the closest real article and take its lead thumbnail. Chunked
 *  to keep request pressure low; results cache like direct hits. */
async function runSearchFallback(slugs: string[]): Promise<void> {
  const missing = slugs.filter((s) => memory.get(s) === "");
  const pending = new Set(missing);
  try {
    for (let i = 0; i < missing.length; i += 4) {
      await Promise.all(missing.slice(i, i + 4).map(searchThumb));
      for (const slug of missing.slice(i, i + 4)) pending.delete(slug);
    }
  } finally {
    // No verdict = search was cut short (request threw / unmounted) — requeue
    // for a later flush. A final "" verdict is NOT requeued (it's definitive).
    for (const slug of pending) inflight.add(slug);
  }
}

async function searchThumb(slug: string): Promise<void> {
  const title = slug.replace(/_/g, " ");
  const url =
    `${API}?action=query&format=json&origin=*&redirects=1` +
    `&generator=search&gsrsearch=${encodeURIComponent(title)}` +
    `&gsrnamespace=0&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wiki search ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, WikiPage> };
  };
  const page = Object.values(data.query?.pages ?? {}).find(
    (p) => p.thumbnail?.source,
  );
  memory.set(slug, page?.thumbnail?.source ?? ""); // "" = search found nothing
  scheduleSave();
  notify([slug]);
}

interface WikiPage {
  title: string;
  thumbnail?: { source: string };
}

async function fetchBatch(slugs: string[]): Promise<void> {
  // Paren-suffixed model variants can slug-collide with their base title —
  // dedupe so they don't waste the batch's 50-title budget.
  const titles = [...new Set(slugs.map((s) => s.replace(/_/g, " ")))].join("|");
  const url =
    `${API}?action=query&format=json&origin=*&redirects=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=640&titles=${encodeURIComponent(titles)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const data = (await res.json()) as {
    query?: {
      normalized?: { from: string; to: string }[];
      redirects?: { from: string; to: string }[];
      pages?: Record<string, WikiPage>;
    };
  };

  const thumbByCanonical = new Map<string, string>();
  for (const page of Object.values(data.query?.pages ?? {})) {
    if (page.thumbnail?.source) thumbByCanonical.set(page.title, page.thumbnail.source);
  }

  // Resolve requested title → canonical page title through the normalization
  // and redirect chains the API echoes back.
  const resolve = new Map<string, string>();
  for (const slug of slugs) resolve.set(slug.replace(/_/g, " "), slug.replace(/_/g, " "));
  for (const { from, to } of data.query?.normalized ?? []) {
    if (resolve.has(from)) resolve.set(from, to);
  }
  for (const { from, to } of data.query?.redirects ?? []) {
    for (const [req, cur] of resolve) if (cur === from) resolve.set(req, to);
  }

  for (const slug of slugs) {
    const requested = slug.replace(/_/g, " ");
    const canonical = resolve.get(requested) ?? requested;
    memory.set(slug, thumbByCanonical.get(canonical) ?? ""); // "" = confirmed none
  }
  scheduleSave();
}

// ── React hook ────────────────────────────────────────────────────────────────

/** Enrich the entire archive (plus photo-less marque headers) once per
 *  session, shortly after the app mounts. Enriching only visited cars left
 *  never-opened cars on their generated scene forever — the "a lot of cars
 *  aren't loading" complaint. The cache makes this a one-time cost per
 *  browser; the idle delay + batched requests keep it off the critical
 *  path. */
export function warmupThumbs(): void {
  loadStorage();
  const needsWiki = CARS.filter(
    (c) => !getCarImage(c) && !catalogCarImage(c),
  );
  ensureThumbs(needsWiki);
  queueSlugs(
    [...new Set(CARS.map((c) => c.brand))]
      .filter((b) => !getBrandImage(b) && !catalogImageFor(wikiSlug(b)))
      .map((b) => wikiSlug(b)),
  );
}

/** Enriched car image: verified static photo → Wikipedia thumbnail → "".
 *  Queues a background lookup for photo-less cars; re-renders subscribers
 *  when their batch resolves. `undefined` (game cars with no archive twin)
 *  yields "" without queuing anything. */
export function useCarImage(car: Car | undefined): string {
  const staticImg = car ? getCarImage(car) : "";
  // Re-render when the Convex catalog lands (module state → version counter).
  const [, setCatV] = useState(catalogVersion);
  useEffect(() => subscribeCatalog(() => setCatV(catalogVersion)), []);
  const hasCatalog = !!(car && catalogCarImage(car));
  const [enriched, setEnriched] = useState(() =>
    car && !staticImg && !hasCatalog ? cachedEnriched(car) : "",
  );

  useEffect(() => {
    if (!car || staticImg || hasCatalog) return;
    setEnriched(cachedEnriched(car));
    ensureThumbs([car]);
    const keys = titleCandidates(car.brand, car.model).map(wikiSlug);
    const unsubs = keys.map((k) => subscribe(k, () => setEnriched(cachedEnriched(car))));
    return () => unsubs.forEach((u) => u());
  }, [car, staticImg, hasCatalog]);

  return staticImg || (car ? catalogCarImage(car) : "") || enriched;
}

/** Enriched brand-header image: hand-verified photo → Wikipedia thumbnail →
 *  "". The 36 expansion marques have no verified brand photo, so their
 *  headers resolve a car-thumbnail or article image at runtime. */
export function useBrandImage(name: string): string {
  const staticImg = getBrandImage(name);
  // Re-render when the Convex catalog lands (module state → version counter).
  const [, setCatV] = useState(catalogVersion);
  useEffect(() => subscribeCatalog(() => setCatV(catalogVersion)), []);
  const wikiKey = name ? wikiSlug(name) : "";
  const catalogKey = name ? asciiSlug(name) : "";
  const catalogHit = catalogImageFor(catalogKey);
  const [enriched, setEnriched] = useState(staticImg);

  useEffect(() => {
    if (staticImg || catalogHit) return;
    setEnriched("");
    if (!name) return; // brand still resolving (deep link) — nothing to look up
    loadStorage();
    const hit = memory.get(wikiKey);
    if (hit) {
      setEnriched(hit);
      return;
    }
    queueSlugs([wikiKey]); // shared queue: dedupes warmup, gets the search pass
    const unsub = subscribe(wikiKey, () => setEnriched(memory.get(wikiKey) ?? ""));
    return () => {
      unsub();
    };
  }, [name, staticImg, catalogHit, wikiKey]);

  return staticImg || catalogHit || enriched;
}
