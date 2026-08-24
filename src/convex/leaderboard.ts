import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Upsert the current player's leaderboard score. Called periodically from the client. */
export const upsertScore = mutation({
  args: {
    cash: v.number(),
    totalEarned: v.number(),
    level: v.number(),
    prestigeLevel: v.number(),
    carCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const user = await ctx.db.get(userId);
    const name = user?.name ?? user?.email?.split("@")[0] ?? "Anonymous";

    const existing = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        cash: args.cash,
        totalEarned: args.totalEarned,
        level: args.level,
        prestigeLevel: args.prestigeLevel,
        carCount: args.carCount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("leaderboard", {
        userId,
        name,
        cash: args.cash,
        totalEarned: args.totalEarned,
        level: args.level,
        prestigeLevel: args.prestigeLevel,
        carCount: args.carCount,
        lastUpdated: Date.now(),
      });
    }
  },
});

/** Get the top 100 players sorted by cash. */
export const getTopPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db
      .query("leaderboard")
      .withIndex("by_cash")
      .order("desc")
      .take(100);
    return players.map((p) => ({
      name: p.name,
      cash: p.cash,
      totalEarned: p.totalEarned,
      level: p.level,
      prestigeLevel: p.prestigeLevel,
      carCount: p.carCount,
    }));
  },
});

/** Get the current user's rank. */
export const getMyRank = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const me = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!me) return null;
    const above = await ctx.db
      .query("leaderboard")
      .withIndex("by_cash", (q) => q.gt("cash", me.cash))
      .collect();
    return { rank: above.length + 1, cash: me.cash, name: me.name };
  },
});
