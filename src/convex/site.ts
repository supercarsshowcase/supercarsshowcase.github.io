import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Admin + analytics backend.
 *
 * - First signed-in user to load the app claims the admin role (see ensureAdmin).
 * - Admin-only queries power the /admin dashboard (accounts, sign-ins, visitors).
 * - Site settings (banner, accent color) are editable by admins and applied
 *   client-side.
 */

export const DEFAULT_SITE_SETTINGS = {
  bannerText: "",
  bannerEnabled: false,
  accent: "#ff2e00",
  siteName: "Supercars Showcase",
} as const;

const SETTINGS_KEY = "site";
const ADMIN_CLAIM_KEY = "admin-claimed";

async function getAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  return user && user.role === "admin" ? user : null;
}

// ── Site settings ────────────────────────────────────────────────────────────

export const getSiteSettings = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    return {
      bannerText: doc?.bannerText ?? DEFAULT_SITE_SETTINGS.bannerText,
      bannerEnabled: doc?.bannerEnabled ?? DEFAULT_SITE_SETTINGS.bannerEnabled,
      accent: doc?.accent ?? DEFAULT_SITE_SETTINGS.accent,
      siteName: doc?.siteName ?? DEFAULT_SITE_SETTINGS.siteName,
    };
  },
});

export const updateSiteSettings = mutation({
  args: {
    bannerText: v.string(),
    bannerEnabled: v.boolean(),
    accent: v.string(),
    siteName: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const accent = /^#[0-9a-fA-F]{6}$/.test(args.accent) ? args.accent : DEFAULT_SITE_SETTINGS.accent;
    const bannerText = args.bannerText.slice(0, 200);
    const siteName = args.siteName.trim().slice(0, 40) || DEFAULT_SITE_SETTINGS.siteName;

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();

    const patch = {
      bannerText,
      bannerEnabled: args.bannerEnabled,
      accent,
      siteName,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("siteSettings", {
        key: SETTINGS_KEY,
        ...patch,
      });
    }
  },
});

// ── Roles ────────────────────────────────────────────────────────────────────

/**
 * Claims admin for the first signed-in user (idempotent, exactly-once via the
 * counters table). Called from the client once per session.
 */
export const ensureAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;

    const claimed = await ctx.db
      .query("counters")
      .withIndex("by_key", (q) => q.eq("key", ADMIN_CLAIM_KEY))
      .first();
    if (claimed) return false;

    const user = await ctx.db.get(userId);
    if (!user) return false;

    await ctx.db.insert("counters", { key: ADMIN_CLAIM_KEY, value: 1 });
    await ctx.db.patch(userId, { role: "admin" });
    return true;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "Anonymous",
        email: u.email ?? "",
        image: u.image ?? "",
        role: u.role ?? "user",
        isAnonymous: u.isAnonymous ?? false,
      }))
      .sort((a, b) => (a.role === "admin" ? -1 : 1) - (b.role === "admin" ? -1 : 1));
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");

    // Never demote the last remaining admin (avoids locking everyone out).
    if (target.role === "admin" && args.role !== "admin") {
      const admins = await ctx.db.query("users").collect();
      const adminCount = admins.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) throw new Error("Cannot demote the last admin.");
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// ── Stats ────────────────────────────────────────────────────────────────────

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdmin(ctx);
    if (!admin) throw new Error("Admin access required.");

    const [users, signins, visits, sessions] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("signins").collect(),
      ctx.db.query("visits").collect(),
      ctx.db.query("authSessions").collect(),
    ]);

    const counters = await ctx.db.query("counters").collect();
    const valueOf = (key: string) =>
      counters.find((c) => c.key === key)?.value ?? 0;

    const dayStart = Date.now() - (Date.now() % 86_400_000);
    const visitorsToday = visits.filter((v) => v.createdAt >= dayStart).length;

    return {
      accounts: users.length,
      signIns: signins.length,
      visits: visits.length,
      visitors: valueOf("visitors"),
      currentSessions: sessions.length,
      visitorsToday,
    };
  },
});

// ── Tracking (called from the client) ────────────────────────────────────────

/** Records a sign-in event. Called once per browser session on auth success. */
export const trackSignIn = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    await ctx.db.insert("signins", { userId, createdAt: Date.now() });
  },
});

/** Records a page view; first-seen device ids also bump the visitor count. */
export const trackVisit = mutation({
  args: {
    deviceId: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const deviceId = args.deviceId.slice(0, 64) || "unknown";

    const existing = await ctx.db
      .query("visits")
      .withIndex("by_device_created", (q) => q.eq("deviceId", deviceId))
      .first();

    await ctx.db.insert("visits", {
      deviceId,
      userId: userId ?? undefined,
      path: args.path.slice(0, 200),
      createdAt: Date.now(),
    });

    if (!existing) {
      const counter = await ctx.db
        .query("counters")
        .withIndex("by_key", (q) => q.eq("key", "visitors"))
        .first();
      if (counter) {
        await ctx.db.patch(counter._id, { value: counter.value + 1 });
      } else {
        await ctx.db.insert("counters", { key: "visitors", value: 1 });
      }
    }
  },
});
