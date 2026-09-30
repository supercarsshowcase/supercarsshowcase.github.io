import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  asciiSlug,
  carKeyIndex,
  isAsciiKey,
  titleCandidates,
} from "../lib/wikiTitles";
import { CARS } from "../data/cars";
import { getCarImage, getBrandImage } from "../data/images";

/**
 * Server-side car-thumbnail seeding.
 *
 * The client-side Wikipedia enrichment depends on every visitor's browser
 * reaching Wikimedia (shared-IP rate limits and blocked networks made
 * thumbnails flaky). This module moves that dependency to the server: an
 * admin-triggered action walks the car catalog, asks Wikipedia's pageimages
 * API for each photo-less car's real lead thumbnail (URLs are never guessed),
 * stores the bytes in Convex file storage, and records the storage id in the
 * `carThumbs` catalog. Clients then serve images from the app's own backend
 * via the /api/thumb/<storageId> HTTP route (http.ts).
 *
 * Lookups are BATCHED (up to 50 titles per API call, ~3 candidate rounds +
 * one search pass) — Wikimedia rate-limits hard, so per-row requests would
 * burn the budget in 429s.
 */

const API = "https://en.wikipedia.org/w/api.php";

/** Catalog entries the client needs (key → storage id). */
export const catalog = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("carThumbs").collect();
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.storageId) map[row.key] = row.storageId;
    }
    return map;
  },
});

/** Seeding progress for the admin panel. */
export const progress = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("carThumbs").collect();
    let total = 0;
    let found = 0;
    let pending = 0;
    for (const row of rows) {
      if (row.slug === "") continue; // brand rows tracked separately
      total++;
      if (row.storageId) found++;
      if (!row.seeded) pending++;
    }
    return { total, found, pending };
  },
});

/** Idempotent kickoff: catalog rows for every photo-less car + brand. */
export const kickoff = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("carThumbs").collect();
    // Purge keys that violate Convex object-field rules (legacy rows from
    // before asciiSlug — e.g. "Murciélago", "4x4²") — they break the whole
    // catalog query for every client.
    for (const row of rows) {
      if (!isAsciiKey(row.key)) await ctx.db.delete(row._id);
    }
    const known = new Set(rows.filter((r) => isAsciiKey(r.key)).map((r) => r.key));
    let added = 0;
    const slugToKey = carKeyIndex(CARS);
    for (const car of CARS) {
      if (getCarImage(car)) continue;
      const key = slugToKey[car.slug] ?? "";
      if (!key || known.has(key)) continue;
      known.add(key);
      await ctx.db.insert("carThumbs", {
        key,
        slug: car.slug,
        seeded: false,
        updatedAt: Date.now(),
      });
      added++;
    }
    for (const brand of new Set(CARS.map((c) => c.brand))) {
      if (getBrandImage(brand)) continue;
      const key = asciiSlug(brand);
      if (!key || known.has(key)) continue;
      known.add(key);
      await ctx.db.insert("carThumbs", {
        key,
        slug: "", // brand row — no archive car behind it
        seeded: false,
        updatedAt: Date.now(),
      });
      added++;
    }
    return { added };
  },
});

/** Record resolved image bytes (first writer wins — no duplicate storage). */
export const storeThumb = internalMutation({
  args: { key: v.string(), slug: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("carThumbs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing?.storageId) return;
    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        seeded: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("carThumbs", {
        key: args.key,
        slug: args.slug,
        storageId: args.storageId,
        seeded: true,
        source: "pageimages",
        updatedAt: Date.now(),
      });
    }
  },
});

/** Mark a row definitively resolved (lookup confirmed: no photo exists). */
export const markSeeded = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("carThumbs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing && !existing.seeded) {
      await ctx.db.patch(existing._id, { seeded: true, updatedAt: Date.now() });
    }
  },
});

/** Pending rows the seeding action processes (actions have no ctx.db). */
export const pendingRows = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("carThumbs")
      .withIndex("by_seeded", (q) => q.eq("seeded", false))
      .take(args.limit);
  },
});

interface SeedPlan {
  key: string;
  slug: string;
  candidates: string[];
}

/**
 * Seeding chunk — call repeatedly (admin panel / app kickoff) until
 * progress().pending is 0. One bounded chunk per call keeps each action well
 * under Convex action limits; network failures leave rows unseeded so a later
 * chunk retries them, while confirmed "no photo" verdicts are marked done.
 */
export const seedChunk = action({
  args: { batchSize: v.optional(v.number()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    processed: number;
    stored: number;
    missed: number;
    failed: number;
  }> => {
    const size = Math.min(Math.max(args.batchSize ?? 20, 1), 50);
    const rows = await ctx.runQuery(internal.thumbs.pendingRows, { limit: size });

    // Build per-row resolution plans.
    const plans: SeedPlan[] = [];
    let missed = 0;
    for (const row of rows) {
      if (row.slug === "") {
        plans.push({
          key: row.key,
          slug: "",
          candidates: [row.key.replace(/_/g, " ")],
        });
        continue;
      }
      const car = CARS.find((c) => c.slug === row.slug);
      if (!car) {
        // Archive row vanished (owner edit) — nothing to resolve anymore.
        await ctx.runMutation(internal.thumbs.markSeeded, { key: row.key });
        missed++;
        continue;
      }
      plans.push({
        key: row.key,
        slug: row.slug,
        candidates: titleCandidates(car.brand, car.model),
      });
    }

    // Batched pageimages rounds: full title, then trimmed base-model
    // candidates. All titles that still need a verdict go in one API call.
    const urlByKey = new Map<string, string>();
    const openKeys = new Set(plans.map((p) => p.key));
    for (let round = 0; round < 3 && openKeys.size > 0; round++) {
      const byTitle = new Map<string, string[]>();
      for (const plan of plans) {
        if (!openKeys.has(plan.key)) continue;
        const title = plan.candidates[round];
        if (!title) continue;
        byTitle.set(title, [...(byTitle.get(title) ?? []), plan.key]);
      }
      if (byTitle.size === 0) break;
      try {
        const data = await wikiPageImages([...byTitle.keys()]);
        // Resolve requested → canonical through normalization/redirects.
        const canonical = new Map<string, string>();
        for (const title of byTitle.keys()) canonical.set(title, title);
        for (const { from, to } of data.normalized ?? []) {
          if (canonical.has(from)) canonical.set(from, to);
        }
        for (const { from, to } of data.redirects ?? []) {
          for (const [req, cur] of canonical) {
            if (cur === from) canonical.set(req, to);
          }
        }
        const thumbs = new Map<string, string>();
        for (const page of Object.values(data.pages ?? {})) {
          if (page.thumbnail?.source) thumbs.set(page.title, page.thumbnail.source);
        }
        for (const [req, cur] of canonical) {
          const hit = thumbs.get(cur);
          if (!hit) continue;
          for (const key of byTitle.get(req) ?? []) {
            urlByKey.set(key, hit);
            openKeys.delete(key);
          }
        }
      } catch {
        break; // batched lookup failed this round — rows stay pending
      }
    }

    // Store bytes for every direct hit (per-row errors stay isolated).
    let stored = 0;
    let failed = 0;
    for (const plan of plans) {
      const url = urlByKey.get(plan.key);
      if (!url) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`image ${res.status}`);
        const blob = await res.blob();
        const storageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.thumbs.storeThumb, {
          key: plan.key,
          slug: plan.slug,
          storageId,
        });
        stored++;
        openKeys.delete(plan.key);
      } catch {
        failed++; // stays pending — a later chunk retries it
      }
    }

    // Search fallback for the rest: trim-level names that aren't article
    // titles get the closest matching article's lead thumbnail. A confirmed
    // empty search marks the row done; a thrown request stays retryable.
    for (const key of [...openKeys]) {
      try {
        const hit = await wikiSearch(key.replace(/_/g, " "));
        if (hit) {
          const res = await fetch(hit);
          if (!res.ok) throw new Error(`image ${res.status}`);
          const blob = await res.blob();
          const storageId = await ctx.storage.store(blob);
          await ctx.runMutation(internal.thumbs.storeThumb, {
            key,
            slug: plans.find((p) => p.key === key)?.slug ?? "",
            storageId,
          });
          stored++;
        } else {
          await ctx.runMutation(internal.thumbs.markSeeded, { key });
          missed++;
        }
        openKeys.delete(key);
      } catch {
        failed++; // stays pending — a later chunk retries it
      }
    }

    return { processed: rows.length, stored, missed, failed };
  },
});

/** One batched pageimages API call for up to ~50 titles. */
async function wikiPageImages(titles: string[]): Promise<{
  normalized?: { from: string; to: string }[];
  redirects?: { from: string; to: string }[];
  pages?: Record<string, { title: string; thumbnail?: { source: string } }>;
}> {
  const url =
    `${API}?action=query&format=json&origin=*&redirects=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=640` +
    `&titles=${encodeURIComponent(titles.join("|"))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const data = (await res.json()) as {
    query?: {
      normalized?: { from: string; to: string }[];
      redirects?: { from: string; to: string }[];
      pages?: Record<string, { title: string; thumbnail?: { source: string } }>;
    };
  };
  return {
    normalized: data.query?.normalized,
    redirects: data.query?.redirects,
    pages: data.query?.pages,
  };
}

/** Search fallback for one title; "" = confirmed no matching photo. */
async function wikiSearch(title: string): Promise<string> {
  const url =
    `${API}?action=query&format=json&origin=*&redirects=1` +
    `&generator=search&gsrsearch=${encodeURIComponent(title)}` +
    `&gsrnamespace=0&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wiki search ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source: string } }> };
  };
  const hit = Object.values(data.query?.pages ?? {}).find(
    (p) => p.thumbnail?.source,
  );
  return hit?.thumbnail?.source ?? "";
}
