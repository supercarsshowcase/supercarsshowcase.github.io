import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Owner-editable public-page copy.
 *
 * The landing ("home") and garage pages are built from default text, but the
 * owner can override almost any visible copy (headlines, subheads, buttons,
 * placeholders, empty states) here. One row per page, holding a flat string map
 * of `field -> text`. Empty values mean "use the built-in default".
 */

async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return false;
  const user = await ctx.db.get(userId);
  return Boolean(user && (user.role === "admin" || user.role === "owner"));
}

/** Public — every visitor needs this to render the owner's chosen copy. */
export const getPageContent = query({
  args: { page: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("pageContent")
      .withIndex("by_key", (q) => q.eq("key", args.page))
      .first();
    return (doc?.fields ?? {}) as Record<string, string>;
  },
});

/**
 * Admin — upsert the copy overrides for one page.
 * Only non-empty values are stored; empty resets that field to its default.
 */
export const savePageContent = mutation({
  args: {
    page: v.string(),
    fields: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("Admin access required.");

    const page = args.page.trim().slice(0, 40) || "home";
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(args.fields)) {
      if (value && value.trim()) cleaned[key.slice(0, 60)] = value.trim();
    }

    const existing = await ctx.db
      .query("pageContent")
      .withIndex("by_key", (q) => q.eq("key", page))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fields: cleaned,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("pageContent", {
        key: page,
        fields: cleaned,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Admin — wipe every override for a page so it returns to the defaults. */
export const resetPageContent = mutation({
  args: { page: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("Admin access required.");
    const existing = await ctx.db
      .query("pageContent")
      .withIndex("by_key", (q) => q.eq("key", args.page))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
