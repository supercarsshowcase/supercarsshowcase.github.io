import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** How stale a leaderboard entry must be (ms) before it's hidden from rankings. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SortKey = "cash" | "earned" | "level" | "cars";

const SORT_INDEX: Record<SortKey, string> = {
  cash: "by_cash",
  earned: "by_totalEarned",
  level: "by_level",
  cars: "by_carCount",
};

/** Document field each sort key ranks by. */
const SORT_FIELD: Record<SortKey, "cash" | "totalEarned" | "level" | "carCount"> = {
  cash: "cash",
  earned: "totalEarned",
  level: "level",
  cars: "carCount",
};

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

    const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        cash: clamp(args.cash),
        totalEarned: clamp(args.totalEarned),
        level: clamp(args.level),
        prestigeLevel: clamp(args.prestigeLevel),
        carCount: clamp(args.carCount),
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("leaderboard", {
        userId,
        name,
        cash: clamp(args.cash),
        totalEarned: clamp(args.totalEarned),
        level: clamp(args.level),
        prestigeLevel: clamp(args.prestigeLevel),
        carCount: clamp(args.carCount),
        lastUpdated: Date.now(),
      });
    }
  },
});

/**
 * Get the top 100 players for the given sort key.
 * Returns `userId` so the client can highlight the viewer's own row even when
 * two players share a name. Entries untouched for 7+ days are hidden so
 * abandoned accounts don't squat the top of the board.
 */
export const getTopPlayers = query({
  args: { sort: v.optional(v.union(v.literal("cash"), v.literal("earned"), v.literal("level"), v.literal("cars"))) },
  handler: async (ctx, args) => {
    const sort: SortKey = args.sort ?? "cash";
    const cutoff = Date.now() - STALE_MS;

    // Read desc from the sort key's own index — no table scan. Take a 400-row
    // superset so the true top 100 survives dropping stale rows. Index order
    // also breaks ties deterministically (equal value → earlier joiner first).
    // The cast only satisfies the typed index-name union; Convex resolves the
    // real registered index at runtime.
    const pool = await ctx.db
      .query("leaderboard")
      .withIndex(SORT_INDEX[sort] as "by_cash")
      .order("desc")
      .take(400);

    const rows = pool
      .filter((p) => p.lastUpdated >= cutoff)
      .slice(0, 100);

    return rows.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      name: p.name,
      cash: p.cash,
      totalEarned: p.totalEarned,
      level: p.level,
      prestigeLevel: p.prestigeLevel,
      carCount: p.carCount,
    }));
  },
});

/**
 * Get the current user's rank for the given sort key — including when they're
 * outside the visible top 100.
 */
export const getMyRank = query({
  args: { sort: v.optional(v.union(v.literal("cash"), v.literal("earned"), v.literal("level"), v.literal("cars"))) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const me = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!me) return null;

    const sort: SortKey = args.sort ?? "cash";
    const cutoff = Date.now() - STALE_MS;

    // Count players strictly ahead of me on the chosen metric using its own
    // index (see getTopPlayers for the cast rationale). One unified path for
    // every sort key — no table scans.
    const field = SORT_FIELD[sort] as "cash";
    const higher = await ctx.db
      .query("leaderboard")
      .withIndex(SORT_INDEX[sort] as "by_cash", (q) => q.gt(field, me[field]))
      .collect();
    const higherCount = higher.filter((p) => p.lastUpdated >= cutoff).length;

    return {
      rank: higherCount + 1,
      userId,
      name: me.name,
      cash: me.cash,
      totalEarned: me.totalEarned,
      level: me.level,
      prestigeLevel: me.prestigeLevel,
      carCount: me.carCount,
    };
  },
});

/** Aggregate stats for the header bar — one cheap query instead of three. */
export const getBoardStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("leaderboard").collect();
    const fresh = all.filter((p) => p.lastUpdated >= Date.now() - STALE_MS);
    let topCash = 0;
    let totalCars = 0;
    for (const p of fresh) {
      if (p.cash > topCash) topCash = p.cash;
      totalCars += p.carCount;
    }
    return { players: fresh.length, topCash, totalCars };
  },
});

