import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Owner-editable car overrides.
 *
 * The archive's cars live in a static client module; the owner can override
 * almost any field per-car here. Every lookup merges these overrides on top of
 * the static data, so edited names, prices, specs and descriptions appear all
 * across the site. Reading overrides is public; writing is admin-only.
 */

const editFields = v.object({
  model: v.optional(v.string()),
  year: v.optional(v.number()),
  category: v.optional(v.string()),
  priceUSD: v.optional(v.number()),
  engine: v.optional(v.string()),
  horsepower: v.optional(v.number()),
  torqueNm: v.optional(v.number()),
  zeroToHundredKmh: v.optional(v.number()),
  topSpeedKmh: v.optional(v.number()),
  weightKg: v.optional(v.number()),
  driveType: v.optional(v.string()),
  transmission: v.optional(v.string()),
  production: v.optional(v.string()),
  description: v.optional(v.string()),
});

async function getAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  return user && user.role === "admin" ? user : null;
}

/** Public — every visitor needs these to render edited car data. */
export const getCarOverrides = query({
  args: {},
  handler: async (ctx) => {
    const edits = await ctx.db.query("carEdits").collect();
    const map: Record<string, Record<string, unknown>> = {};
    for (const e of edits) {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(e)) {
        if (key === "slug" || key === "updatedAt" || value === undefined) continue;
        cleaned[key] = value;
      }
      map[e.slug] = cleaned;
    }
    return map;
  },
});

/** Admin — upsert the override for one car. */
export const saveCarEdit = mutation({
  args: { slug: v.string(), fields: editFields },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const slug = args.slug.trim().slice(0, 100);
    if (!slug) throw new Error("Invalid car.");

    const existing = await ctx.db
      .query("carEdits")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    const patch = { ...args.fields, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("carEdits", { slug, ...args.fields, updatedAt: Date.now() });
    }
  },
});

/** Admin — remove the overrides for one car (back to stock). */
export const resetCarEdit = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const existing = await ctx.db
      .query("carEdits")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Admin — wipe every override so the whole archive returns to stock. */
export const resetAllCarEdits = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const edits = await ctx.db.query("carEdits").collect();
    for (const e of edits) await ctx.db.delete(e._id);
  },
});
