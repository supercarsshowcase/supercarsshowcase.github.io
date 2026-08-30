import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Maximum cash a player can gift to another player. */
const MAX_PLAYER_GIFT = 10_000_000;

async function requireAuth(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated.");
  return userId;
}

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "owner" && user.role !== "admin" && user.role !== "moderator"))
    throw new Error("Admin access required.");
  return { userId, user };
}

// ── Player-to-Player Cash Gift ─────────────────────────────────────────────

export const giftCash = mutation({
  args: {
    recipientId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const senderId = await requireAuth(ctx);

    if (senderId === args.recipientId) {
      throw new Error("You cannot gift yourself.");
    }

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found.");

    if (args.amount <= 0 || !Number.isFinite(args.amount)) {
      throw new Error("Invalid amount.");
    }
    if (args.amount > MAX_PLAYER_GIFT) {
      throw new Error(`Maximum gift is $${MAX_PLAYER_GIFT.toLocaleString()}.`);
    }

    await ctx.db.insert("adminGifts", {
      userId: args.recipientId,
      kind: "player_gift",
      amount: Math.round(args.amount),
      fromUserId: senderId,
      claimed: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      amount: Math.round(args.amount),
      recipientName: recipient.name ?? "Unknown",
    };
  },
});

// ── Admin: Gift Random Cars ────────────────────────────────────────────────

export const giftRandomCars = mutation({
  args: {
    userId: v.id("users"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");

    if (args.count <= 0 || args.count > 1_000_000 || !Number.isFinite(args.count)) {
      throw new Error("Count must be between 1 and 1,000,000.");
    }

    await ctx.db.insert("adminGifts", {
      userId: args.userId,
      kind: "random_cars",
      amount: Math.round(args.count),
      claimed: false,
      createdAt: Date.now(),
    });

    return { success: true, count: Math.round(args.count), userName: target.name ?? "Unknown" };
  },
});

// ── Query: Get gifts for a specific user ───────────────────────────────────

export const getMyGifts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const gifts = await ctx.db
      .query("adminGifts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return gifts.filter((g) => !g.claimed);
  },
});

// ── Query: Search users by name or email ────────────────────────────────────

export const searchUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const q = args.search.toLowerCase().trim();
    if (q.length < 2) return [];

    // Search by username index
    const byUsername = await ctx.db
      .query("users")
      .withIndex("by_username")
      .collect();

    const results: {
      id: string;
      name: string;
      email: string | undefined;
      username: string | undefined;
      role: string | undefined;
    }[] = [];

    for (const u of byUsername) {
      const username = (u.username ?? "").toLowerCase();
      if (username.includes(q)) {
        results.push({
          id: u._id,
          name: u.name ?? "Unknown",
          email: u.email,
          username: u.username,
          role: u.role,
        });
      }
    }

    // Fallback: search by name/email (no index, but only for small result sets)
    if (results.length < 20) {
      const allUsers = await ctx.db.query("users").collect();
      for (const u of allUsers) {
        if (results.length >= 20) break;
        const name = (u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        if (!results.some((r) => r.id === u._id) && (name.includes(q) || email.includes(q))) {
          results.push({
            id: u._id,
            name: u.name ?? "Unknown",
            email: u.email,
            username: u.username,
            role: u.role,
          });
        }
      }
    }

    return results;
  },
});
