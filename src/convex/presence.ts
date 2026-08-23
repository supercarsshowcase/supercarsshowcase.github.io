import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const ONLINE_THRESHOLD = 60_000; // 60 seconds — considered online if last seen within this window

/** Client calls this on mount and every ~30s to stay "online". */
export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Only update if enough time has passed (avoids excessive writes)
      if (now - existing.lastSeen > HEARTBEAT_INTERVAL / 2) {
        await ctx.db.patch(existing._id, { lastSeen: now });
      }
    } else {
      await ctx.db.insert("presence", { userId, lastSeen: now });
    }
  },
});

/** Remove presence row on sign-out. */
export const removePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Returns how many users are currently online (excluding the caller). */
export const onlineCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    const threshold = Date.now() - ONLINE_THRESHOLD;

    const all = await ctx.db.query("presence").collect();
    const meStr = me?.toString();
    return all.filter(
      (p) => p.lastSeen >= threshold && p.userId !== meStr,
    ).length;
  },
});

/** Returns the online count including the caller (for admin panel). */
export const onlineCountAll = query({
  args: {},
  handler: async (ctx) => {
    const threshold = Date.now() - ONLINE_THRESHOLD;
    const all = await ctx.db.query("presence").collect();
    return all.filter((p) => p.lastSeen >= threshold).length;
  },
});

/**
 * Periodically clean up stale presence rows (older than 5 minutes).
 * Can be called from a scheduled function or by any client.
 */
export const cleanupStale = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 5 * 60_000;
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
      .collect();
    for (const doc of stale) {
      await ctx.db.delete(doc._id);
    }
    return stale.length;
  },
});
