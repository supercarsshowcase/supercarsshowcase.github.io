import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Return the latest 100 chat messages (ascending by time). */
export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_created")
      .order("desc")
      .take(100);
    return messages.reverse();
  },
});

/** Post a new chat message. Requires authentication. */
export const sendMessage = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Resolve the sender by AUTHENTICATED ID — not by email. Guests and
    // username/password accounts have no `identity.email`, and the old email
    // lookup fell through to the FIRST user row, attributing their messages
    // to a random different account (so "mine" checks and badges never showed).
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const text = args.text.trim();
    if (!text || text.length > 500) {
      throw new Error("Message must be 1–500 characters");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found");

    // Rate limit: max 1 message per 2 seconds
    const recent = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);

    if (recent.length > 0 && Date.now() - recent[0].createdAt < 2000) {
      throw new Error("Slow down! Wait a moment before sending another message.");
    }

    // Name/image fall back to the auth identity only when the profile lacks them.
    const identity = await ctx.auth.getUserIdentity();
    const name =
      user.name ?? user.username ?? identity?.name ?? "Anonymous";
    const image = user.image ?? identity?.pictureUrl ?? undefined;
    const role = user.role ?? undefined;

    await ctx.db.insert("chatMessages", {
      userId,
      name,
      image,
      role,
      text,
      createdAt: Date.now(),
    });

    // Prune old messages: keep only last 200
    const oldMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_created")
      .order("desc")
      .take(201);
    for (const msg of oldMessages.slice(200)) {
      await ctx.db.delete(msg._id);
    }
  },
});

/** Staff delete — owner/admin/moderator can remove any message (moderation). */
export const deleteMessage = mutation({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const staff = await ctx.db.get(userId);
    if (
      !staff ||
      (staff.role !== "owner" && staff.role !== "admin" && staff.role !== "moderator")
    ) {
      throw new Error("Only staff can delete messages.");
    }
    await ctx.db.delete(args.messageId);
  },
});
