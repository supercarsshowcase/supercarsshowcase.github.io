import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const text = args.text.trim();
    if (!text || text.length > 500) {
      throw new Error("Message must be 1–500 characters");
    }

    // Rate limit: max 1 message per 2 seconds
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        identity.email ? q.eq("email", identity.email) : q,
      )
      .first();
    const userId = user?._id;

    if (!userId) throw new Error("User profile not found");

    const recent = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);

    if (recent.length > 0 && Date.now() - recent[0].createdAt < 2000) {
      throw new Error("Slow down! Wait a moment before sending another message.");
    }

    // Fetch user profile for name/image
    const name =
      user?.username ?? user?.name ?? identity.name ?? "Anonymous";
    const image = user?.image ?? identity.pictureUrl ?? undefined;
    const role = user?.role ?? undefined;

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
