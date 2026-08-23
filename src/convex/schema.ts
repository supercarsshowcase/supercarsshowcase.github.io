import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.OWNER),
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MODERATOR),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Custom profile fields (editable from /profile)
      bio: v.optional(v.string()),
      accent: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Analytics ──
    // Simple key/value counters (e.g. "visits", "visitors").
    counters: defineTable({
      key: v.string(),
      value: v.number(),
    }).index("by_key", ["key"]),

    // One row per recorded page view, tagged with a per-browser device id.
    visits: defineTable({
      deviceId: v.string(),
      userId: v.optional(v.id("users")),
      path: v.string(),
      createdAt: v.number(),
    })
      .index("by_device_created", ["deviceId", "createdAt"])
      .index("by_created", ["createdAt"]),

    // One row per recorded sign-in event.
    signins: defineTable({
      userId: v.id("users"),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    // Site-wide settings editable from the admin panel (single doc, key "site").
    siteSettings: defineTable({
      key: v.string(),
      bannerText: v.string(),
      bannerEnabled: v.boolean(),
      accent: v.string(),
      siteName: v.string(),
    }).index("by_key", ["key"]),

    // Owner-editable car overrides, keyed by slug. Only edited fields stored.
    carEdits: defineTable({
      slug: v.string(),
      model: v.optional(v.string()),
      year: v.optional(v.number()),
      category: v.optional(v.string()),
      priceUSD: v.optional(v.number()),
      engine: v.optional(v.string()),
      horsepower: v.optional(v.number()),
      torqueNm: v.optional(v.number()),
      zeroToHundredKmh: v.optional(v.number()),
      topSpeedKmh: v.optional(v.number()),
      weightKg: v.optional(v.number()),
      driveType: v.optional(v.string()),
      transmission: v.optional(v.string()),
      production: v.optional(v.string()),
      description: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_slug", ["slug"]),

    // Visitor feedback, ideas and suggestions, reviewed in the admin panel.
    feedback: defineTable({
      userId: v.id("users"),
      type: v.string(), // "idea" | "suggestion" | "bug" | "praise" | "other"
      message: v.string(),
      carSlug: v.optional(v.string()),
      status: v.string(), // "new" | "read"
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    // Per-user named car collections ("My Garage").
    garages: defineTable({
      userId: v.id("users"),
      name: v.string(),
      carSlugs: v.array(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // Editable public-page copy, keyed by page ("home" | "garage"). The owner
    // overrides any of these fields from the Admin "Pages" editor.
    pageContent: defineTable({
      key: v.string(),
      fields: v.record(v.string(), v.string()),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // Transient global announcements. An admin broadcasts one or more messages
    // in a single batch; every visitor sees them pop up (top-center) one after
    // another a few seconds each, then they fade.
    announcements: defineTable({
      authorName: v.string(),
      authorRole: v.optional(v.string()),
      // First/primary message — kept for the single-message API.
      message: v.string(),
      // Full batch (may hold more than one) — used by the multi-message API.
      messages: v.optional(v.array(v.string())),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    // Global multiplier event set by admins. Single doc keyed "active".
    // When active, all players earn multiplied income.
    multiplierEvents: defineTable({
      key: v.string(),
      multiplier: v.number(),
      label: v.string(),
      expiresAt: v.number(),
      createdAt: v.number(),
    }).index("by_key", ["key"]),

    // Admin gifts (money / cars) pending for individual users.
    adminGifts: defineTable({
      userId: v.id("users"),
      kind: v.string(), // "money" | "car"
      amount: v.optional(v.number()),
      carId: v.optional(v.string()),
      claimed: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_claimed", ["userId", "claimed"]),

    // Online presence tracking — one row per user, updated on heartbeat.
    presence: defineTable({
      userId: v.id("users"),
      lastSeen: v.number(),
    }).index("by_user", ["userId"])
      .index("by_lastSeen", ["lastSeen"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;
