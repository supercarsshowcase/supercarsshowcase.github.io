import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Save game state to cloud. Called periodically and on manual save. */
export const save = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "not-authenticated" };

    const existing = await ctx.db
      .query("gameSaves")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        state: args.state,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameSaves", {
        userId,
        state: args.state,
        updatedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

/** Load game state from cloud. Returns null if no save exists. */
export const load = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const save = await ctx.db
      .query("gameSaves")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!save) return null;
    return { state: save.state, updatedAt: save.updatedAt };
  },
});
