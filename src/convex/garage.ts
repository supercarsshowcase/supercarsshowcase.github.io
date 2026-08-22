import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Per-user named car collections ("My Garage").
 *
 * Each signed-in user owns at most one garage document holding the slugs of
 * the cars they've collected. Adding a car auto-creates the garage with a
 * default name so the flow is frictionless; the owner can rename it any time.
 */

export const DEFAULT_GARAGE_NAME = "My Garage";
const MAX_NAME_LENGTH = 60;
/** The archive ships 157 machines — that's the largest sensible collection. */
const MAX_CARS = 157;

export const getMyGarage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const doc = await ctx.db
      .query("garages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) return null;

    return {
      name: doc.name,
      carSlugs: doc.carSlugs,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
});

export const createGarage = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to build your garage.");

    const name = args.name.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) throw new Error("Give your garage a name.");

    const existing = await ctx.db
      .query("garages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) throw new Error("You already have a garage.");

    await ctx.db.insert("garages", {
      userId,
      name,
      carSlugs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const renameGarage = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to rename your garage.");

    const name = args.name.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) throw new Error("Give your garage a name.");

    const doc = await ctx.db
      .query("garages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) throw new Error("Create your garage first.");

    await ctx.db.patch(doc._id, { name, updatedAt: Date.now() });
  },
});

export const addCarToGarage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to build your garage.");

    const slug = args.slug.trim().slice(0, 100);
    if (!slug) throw new Error("Invalid car.");

    const doc = await ctx.db
      .query("garages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // No garage yet? Create one on the spot with the car already inside.
    if (!doc) {
      await ctx.db.insert("garages", {
        userId,
        name: DEFAULT_GARAGE_NAME,
        carSlugs: [slug],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    const carSlugs = doc.carSlugs.includes(slug)
      ? doc.carSlugs
      : [...doc.carSlugs, slug].slice(0, MAX_CARS);
    await ctx.db.patch(doc._id, { carSlugs, updatedAt: Date.now() });
  },
});

export const removeCarFromGarage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to update your garage.");

    const doc = await ctx.db
      .query("garages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) return;

    await ctx.db.patch(doc._id, {
      carSlugs: doc.carSlugs.filter((s) => s !== args.slug),
      updatedAt: Date.now(),
    });
  },
});
