import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Profile customization: display name, bio, accent color, and avatar upload.
 *
 * Avatars use Convex file storage: the client requests an upload URL, PUTs the
 * image, then stores the returned storage id here. Old avatar files are left
 * in storage (Convex cleans up unreferenced files on a schedule).
 */

const MAX_NAME_LENGTH = 40;
const MAX_BIO_LENGTH = 160;

export const updateProfile = mutation({
  args: {
    name: v.string(),
    bio: v.string(),
    accent: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to update your profile.");

    const name = args.name.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) throw new Error("Your name can't be empty.");

    const bio = args.bio.trim().slice(0, MAX_BIO_LENGTH);
    const accent = /^#[0-9a-fA-F]{6}$/.test(args.accent) ? args.accent : undefined;

    await ctx.db.patch(userId, { name, bio, accent });
  },
});

/** Returns a one-time URL the client uploads the avatar file to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Stores the uploaded file's id as the current user's avatar. */
export const updateAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to update your profile.");

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload failed — please try again.");

    await ctx.db.patch(userId, { image: url });
  },
});
