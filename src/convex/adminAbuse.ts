import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated.");
  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "owner" && user.role !== "admin" && user.role !== "moderator"))
    throw new Error("Admin access required.");
  return user;
}

// ── Give money to a user ──────────────────────────────────────────────────────

export const giveMoney = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if (args.amount <= 0) {
      throw new Error("Amount must be at least $1.");
    }
    // Store the grant in a new table or just log it. For the game, we'll
    // use a Convex "adminGrants" table. But since the game saves locally,
    // the simplest approach is a global multiplier event or a direct message.
    // Actually — the game is localStorage-based. We need a different approach.
    // The game state lives on the client. So "give money" needs to be a
    // global server-side event that the game reads.
    //
    // Simplest: store grants in a table, game polls and applies.
    // But that's complex. Better: make the multiplier event the main tool,
    // and for "give car / give money" we use a global gift box.
    //
    // For MVP: store admin gifts that the game picks up on next load.
    await ctx.db.insert("adminGifts", {
      userId: args.userId,
      kind: "money",
      amount: args.amount,
      claimed: false,
      createdAt: Date.now(),
    });
    return { success: true, amount: args.amount, userName: target.name ?? "Unknown" };
  },
});

// ── Give a car to a user ──────────────────────────────────────────────────────

export const giveCar = mutation({
  args: {
    userId: v.id("users"),
    carId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if (!args.carId.trim()) throw new Error("Car ID required.");
    await ctx.db.insert("adminGifts", {
      userId: args.userId,
      kind: "car",
      carId: args.carId.trim(),
      claimed: false,
      createdAt: Date.now(),
    });
    return { success: true, carId: args.carId, userName: target.name ?? "Unknown" };
  },
});

// ── Multiplier event ──────────────────────────────────────────────────────────

export const setMultiplierEvent = mutation({
  args: {
    multiplier: v.number(),
    label: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.multiplier < 2 || args.multiplier > 10_000) {
      throw new Error("Multiplier must be between 2x and 10,000x.");
    }
    if (args.durationMinutes < 1 || args.durationMinutes > 1440) {
      throw new Error("Duration must be between 1 and 1440 minutes (24h).");
    }
    const now = Date.now();
    const expiresAt = now + args.durationMinutes * 60_000;

    // Upsert the single active event doc
    const existing = await ctx.db
      .query("multiplierEvents")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        multiplier: args.multiplier,
        label: args.label.trim() || `${args.multiplier}x EVENT`,
        expiresAt,
        createdAt: now,
      });
    } else {
      await ctx.db.insert("multiplierEvents", {
        key: "active",
        multiplier: args.multiplier,
        label: args.label.trim() || `${args.multiplier}x EVENT`,
        expiresAt,
        createdAt: now,
      });
    }
    return { success: true };
  },
});

export const clearMultiplierEvent = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("multiplierEvents")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const getActiveEvent = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("multiplierEvents")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();
    if (!doc || Date.now() > doc.expiresAt) return null;
    return {
      multiplier: doc.multiplier,
      label: doc.label,
      expiresAt: doc.expiresAt,
    };
  },
});

export const getMyGifts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const gifts = await ctx.db
      .query("adminGifts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("claimed"), false))
      .collect();
    return gifts;
  },
});

export const claimGift = mutation({
  args: { giftId: v.id("adminGifts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");
    const gift = await ctx.db.get(args.giftId);
    if (!gift || gift.userId !== userId || gift.claimed) {
      throw new Error("Gift not found or already claimed.");
    }
    await ctx.db.patch(args.giftId, { claimed: true });
    return gift;
  },
});
