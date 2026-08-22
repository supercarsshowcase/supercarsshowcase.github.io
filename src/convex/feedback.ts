import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Visitor feedback, ideas and suggestions.
 *
 * - `submitFeedback` is available to any signed-in user and powers the
 *   /feedback page.
 * - Everything else is admin-only and powers the inbox in the admin panel.
 */

export const FEEDBACK_TYPES = ["idea", "suggestion", "bug", "praise", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

const typeValidator = v.union(...FEEDBACK_TYPES.map((t) => v.literal(t)));
const statusValidator = v.union(v.literal("new"), v.literal("read"));

async function getAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  return user && (user.role === "owner" || user.role === "admin" || user.role === "moderator") ? user : null;
}

export const submitFeedback = mutation({
  args: {
    type: typeValidator,
    message: v.string(),
    carSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to send feedback.");

    const message = args.message.trim();
    if (message.length < 10) throw new Error("Tell us a little more — at least 10 characters.");
    if (message.length > 1000) throw new Error("Please keep it under 1000 characters.");

    await ctx.db.insert("feedback", {
      userId,
      type: args.type,
      message: message.slice(0, 1000),
      carSlug: args.carSlug && args.carSlug.trim() ? args.carSlug.trim().slice(0, 100) : undefined,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

export const listFeedback = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const items = await ctx.db.query("feedback").order("desc").collect();
    const users = await ctx.db.query("users").collect();
    const byId = new Map(users.map((u) => [u._id, u]));

    return items.map((f) => {
      const user = byId.get(f.userId);
      return {
        _id: f._id,
        type: f.type,
        message: f.message,
        carSlug: f.carSlug ?? null,
        status: f.status,
        createdAt: f.createdAt,
        authorName: user?.name ?? "Anonymous",
        authorEmail: user?.email ?? "",
      };
    });
  },
});

/**
 * Public wall — every visitor can read what people have submitted. Emails and
 * read-status stay out of this view; only the author's name is shown.
 */
export const listPublicFeedback = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("feedback").order("desc").take(100);
    const users = await ctx.db.query("users").collect();
    const byId = new Map(users.map((u) => [u._id, u]));

    return items.map((f) => {
      const user = byId.get(f.userId);
      return {
        _id: f._id,
        type: f.type,
        message: f.message,
        carSlug: f.carSlug ?? null,
        createdAt: f.createdAt,
        authorName: user?.name ?? "Anonymous",
        authorImage: user?.image ?? "",
        authorAccent: user?.accent ?? "",
      };
    });
  },
});

export const setFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const doc = await ctx.db.get(args.feedbackId);
    if (!doc) throw new Error("Feedback not found.");
    await ctx.db.patch(args.feedbackId, { status: args.status });
  },
});

export const deleteFeedback = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const doc = await ctx.db.get(args.feedbackId);
    if (!doc) throw new Error("Feedback not found.");
    await ctx.db.delete(args.feedbackId);
  },
});
