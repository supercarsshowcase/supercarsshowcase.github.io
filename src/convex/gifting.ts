import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Maximum cash a player can gift to another player. */
const MAX_PLAYER_GIFT = 10_000_000;

/** Maximum random cars an admin can gift at once. */
const MAX_RANDOM_CARS = 1_000_000;

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

/**
 * Any authenticated player can gift up to $10M cash to another player.
 * The sender's game state is localStorage-based, so we create a gift
 * record that the recipient can claim. The sender must confirm they
 * have the funds (client-side check + server-side max cap).
 */
export const giftCash = mutation({
  args: {
    recipientId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const senderId = await requireAuth(ctx);

    // Can't gift yourself
    if (senderId === args.recipientId) {
      throw new Error("You cannot gift yourself.");
    }

    // Validate recipient exists
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found.");

    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Amount must be at least $1.");
    }
    if (args.amount > MAX_PLAYER_GIFT) {
      throw new Error(`Maximum gift amount is $${MAX_PLAYER_GIFT.toLocaleString()}.`);
    }

    // Check sender hasn't exceeded daily gifting limit (optional anti-abuse)
    // For now, just create the gift
    await ctx.db.insert("adminGifts", {
      userId: args.recipientId,
      kind: "player_gift",
      amount: Math.round(args.amount),
      fromUserId: senderId,
      claimed: false,
      createdAt: Date.now(),
    });

    const sender = await ctx.db.get(senderId);
    return {
      success: true,
      amount: Math.round(args.amount),
      recipientName: recipient.name ?? "Unknown",
      senderName: sender?.name ?? "Unknown",
    };
  },
});

// ── Admin: Gift Random Cars ────────────────────────────────────────────────

/**
 * Admin can gift up to 1M random cars to a player.
 * Cars are randomly selected from the game car pool.
 */
export const giftRandomCars = mutation({
  args: {
    userId: v.id("users"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");

    if (args.count <= 0) {
      throw new Error("Count must be at least 1.");
    }
    if (args.count > MAX_RANDOM_CARS) {
      throw new Error(`Maximum is ${MAX_RANDOM_CARS.toLocaleString()} cars.`);
    }

    // We'll create a single gift record with the count
    // The client will handle rolling random cars when claiming
    await ctx.db.insert("adminGifts", {
      userId: args.userId,
      kind: "random_cars",
      amount: Math.round(args.count),
      claimed: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      count: Math.round(args.count),
      userName: target.name ?? "Unknown",
    };
  },
});

// ── Query: Get all gifts (for admin) ───────────────────────────────────────

export const getAllGifts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const gifts = await ctx.db.query("adminGifts").collect();
    return gifts;
  },
});

// ── Query: Search users by name or email ────────────────────────────────────

export const searchUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const query = args.search.toLowerCase().trim();
    if (query.length < 2) return [];

    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => {
        const name = (u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const username = (u.username ?? "").toLowerCase();
        return name.includes(query) || email.includes(query) || username.includes(query);
      })
      .slice(0, 20)
      .map((u) => ({
        id: u._id,
        name: u.name ?? "Unknown",
        email: u.email,
        username: u.username,
        role: u.role,
      }));
  },
});
