import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
