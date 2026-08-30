import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Maximum cash a player can gift to another player. */
const MAX_PLAYER_GIFT = 10_000_000;
/** Daily gifting cap per sender (sum of all gifts). */
const DAILY_GIFT_CAP = 50_000_000;

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
    if (!Number.isFinite(args.amount)) {
      throw new Error("Invalid amount.");
    }
    if (args.amount > MAX_PLAYER_GIFT) {
      throw new Error(`Maximum gift amount is $${MAX_PLAYER_GIFT.toLocaleString()}.`);
    }

    // Check daily gifting limit: sum all unclaimed + claimed gifts from today
    const now = Date.now();
    const dayStart = now - (now % (24 * 60 * 60 * 1000)); // start of today (UTC)
    const recentGifts = await ctx.db
      .query("adminGifts")
      .withIndex("by_user", (q) => q.eq("userId", args.recipientId))
      .collect();

    // Check sender's total gifted today (across all recipients)
    const allRecentGifts = await ctx.db.query("adminGifts").collect();
    const senderTotalToday = allRecentGifts
      .filter(
        (g) =>
          g.kind === "player_gift" &&
          g.fromUserId === senderId &&
          g.createdAt >= dayStart &&
          g.amount,
      )
      .reduce((sum, g) => sum + (g.amount ?? 0), 0);

    if (senderTotalToday + args.amount > DAILY_GIFT_CAP) {
      throw new Error(
        `Daily gift limit reached. You can gift $${Math.max(0, DAILY_GIFT_CAP - senderTotalToday).toLocaleString()} more today.`,
      );
    }

    // Create the gift
    await ctx.db.insert("adminGifts", {
      userId: args.recipientId,
      kind: "player_gift",
      amount: Math.round(args.amount),
      fromUserId: senderId,
      claimed: false,
      createdAt: now,
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

    if (args.count <= 0) {
      throw new Error("Count must be at least 1.");
    }
    if (!Number.isFinite(args.count)) {
      throw new Error("Invalid count.");
    }
    if (args.count > 1_000_000) {
      throw new Error("Maximum is 1,000,000 cars.");
    }

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
    const q = args.search.toLowerCase().trim();
    if (q.length < 2) return [];

    // Use the email index for email lookups, username index for username lookups
    const results: {
      id: string;
      name: string;
      email: string | undefined;
      username: string | undefined;
      role: string | undefined;
    }[] = [];

    // Search by username index
    const byUsername = await ctx.db
      .query("users")
      .withIndex("by_username")
      .collect();

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

    // Also search by scanning name field (no index, but only for short lists)
    // This is a secondary fallback - the main search is username-based
    if (results.length < 20) {
      const allUsers = await ctx.db.query("users").collect();
      for (const u of allUsers) {
        const name = (u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const alreadyFound = results.some((r) => r.id === u._id);
        if (!alreadyFound && (name.includes(q) || email.includes(q))) {
          results.push({
            id: u._id,
            name: u.name ?? "Unknown",
            email: u.email,
            username: u.username,
            role: u.role,
          });
        }
        if (results.length >= 20) break;
      }
    }

    return results.slice(0, 20);
  },
});
