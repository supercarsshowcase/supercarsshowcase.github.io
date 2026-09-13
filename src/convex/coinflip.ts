import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Online 1v1 coinflip — REAL multiplayer on Convex.
 *
 * Flow: creator posts an open match (bet + their pick) → any signed-in
 * player sees it live and joins on the OPPOSITE side → the flip happens
 * SERVER-SIDE at join time so both clients watch the same authoritative
 * result arrive through their subscription. No client trusts its own RNG.
 *
 * Money flow (client-side economy, same as the rest of the game):
 *  - creator deducts their bet when creating; refunded if they cancel
 *    or the match expires (their client watches for the `cancelled` row)
 *  - joiner deducts on join (refunded if the join loses the race)
 *  - the winner is paid 2× bet (stake back + opponent's stake), paid
 *    client-side off the settled row, deduped per match id
 */

/** Open matches older than this are auto-cancelled with a refund marker. */
const OPEN_TTL_MS = 5 * 60_000;

async function requireUser(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Sign in to play online.");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User profile not found.");
  return { userId, name: user.name ?? user.username ?? "Player" };
}

/** Mark expired open matches as cancelled (mutations only — queries can't write). */
async function reapExpired(ctx: MutationCtx) {
  const now = Date.now();
  const open = await ctx.db
    .query("coinflipMatches")
    .withIndex("by_status", (q) => q.eq("status", "open"))
    .collect();
  for (const m of open) {
    if (now - m.createdAt > OPEN_TTL_MS) {
      await ctx.db.patch(m._id, { status: "cancelled" });
    }
  }
}

/** Open matches, freshest first. Expired ones are filtered (reaped lazily by mutations). */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const userId = await getAuthUserId(ctx);
    const open = await ctx.db
      .query("coinflipMatches")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return open
      .filter((m) => now - m.createdAt <= OPEN_TTL_MS)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((m) => ({
        _id: m._id,
        bet: m.bet,
        creatorName: m.creatorName,
        creatorPick: m.creatorPick,
        createdAt: m.createdAt,
        mine: userId !== null && m.creatorId === userId,
      }));
  },
});

/**
 * My recent settled + cancelled matches — powers the live win/loss reveal
 * on both clients AND the creator's expiry refund. Deduped by match id
 * on the client (each row may only pay/refund once).
 */
export const listMyRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const done = await ctx.db
      .query("coinflipMatches")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .order("desc")
      .take(40);
    const cancelledMine = await ctx.db
      .query("coinflipMatches")
      .withIndex("by_status", (q) => q.eq("status", "cancelled"))
      .order("desc")
      .take(30);

    const settled = done
      .filter((m) => m.creatorId === userId || m.opponentId === userId)
      .slice(0, 5)
      .map((m) => ({
        _id: m._id,
        status: "done" as const,
        bet: m.bet,
        won: m.winnerId === userId,
        iAmCreator: m.creatorId === userId,
        myPick: m.creatorId === userId ? m.creatorPick : (m.opponentPick ?? "heads"),
        winnerSide: m.winnerSide ?? ("heads" as const),
        opponentName:
          m.creatorId === userId ? (m.opponentName ?? "Player") : m.creatorName,
        createdAt: m.createdAt,
      }));

    // My still-open matches — lets the client keep the "waiting" UI in sync
    // AND self-heal a stale match (past TTL) into a refund via settleCreator.
    const openMine = await ctx.db
      .query("coinflipMatches")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();
    const openRows = openMine
      .filter((m) => m.status === "open")
      .slice(0, 1)
      .map((m) => ({
        _id: m._id,
        status: "open" as const,
        bet: m.bet,
        won: false,
        iAmCreator: true,
        myPick: m.creatorPick,
        winnerSide: m.creatorPick,
        opponentName: "",
        createdAt: m.createdAt,
      }));

    const refunded = cancelledMine
      .filter((m) => m.creatorId === userId)
      .slice(0, 5)
      .map((m) => ({
        _id: m._id,
        status: "cancelled" as const,
        bet: m.bet,
        won: false,
        iAmCreator: true,
        myPick: m.creatorPick,
        winnerSide: m.creatorPick,
        opponentName: "",
        createdAt: m.createdAt,
      }));

    return [...openRows, ...settled, ...refunded];
  },
});

/** Create an open match. Client deducts the bet on success. */
export const create = mutation({
  args: {
    bet: v.number(),
    pick: v.union(v.literal("heads"), v.literal("tails")),
  },
  handler: async (ctx, args) => {
    await reapExpired(ctx);
    const { userId, name } = await requireUser(ctx);
    const bet = Math.floor(args.bet);
    if (!Number.isFinite(bet) || bet <= 0) throw new ConvexError("Invalid bet.");
    if (bet > 100_000_000) throw new ConvexError("Max bet is $100,000,000.");

    // One open match per player at a time.
    const mine = await ctx.db
      .query("coinflipMatches")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();
    if (mine.some((m) => m.status === "open")) {
      throw new ConvexError("You already have an open match. Cancel it first.");
    }

    const matchId = await ctx.db.insert("coinflipMatches", {
      status: "open",
      bet,
      creatorId: userId,
      creatorName: name,
      creatorPick: args.pick,
      createdAt: Date.now(),
    });
    return { matchId, bet };
  },
});

/** Cancel my open match (before anyone joins). Refund marker. */
export const cancel = mutation({
  args: { matchId: v.id("coinflipMatches") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const m = await ctx.db.get(args.matchId);
    if (!m || m.creatorId !== userId) throw new ConvexError("Match not found.");
    if (m.status !== "open") throw new ConvexError("Match is no longer open.");
    await ctx.db.patch(args.matchId, { status: "cancelled" });
    return { refund: m.bet };
  },
});

/**
 * Join an open match — THE FLIP HAPPENS HERE, SERVER-SIDE. Both clients
 * subscribe to listMyRecent and see the same settled row arrive.
 */
export const join = mutation({
  args: { matchId: v.id("coinflipMatches") },
  handler: async (ctx, args) => {
    await reapExpired(ctx);
    const { userId, name } = await requireUser(ctx);
    const m = await ctx.db.get(args.matchId);
    if (!m || m.status !== "open") {
      throw new ConvexError("Match already taken or closed.");
    }
    if (m.creatorId === userId) throw new ConvexError("That's your own match!");
    if (Date.now() - m.createdAt > OPEN_TTL_MS) {
      throw new ConvexError("Match expired.");
    }

    // Server-side coin: authoritative for both players.
    const flip = Math.random() < 0.5 ? "heads" : "tails";
    const creatorWon = flip === m.creatorPick;
    const opponentPick = m.creatorPick === "heads" ? "tails" : "heads";

    await ctx.db.patch(args.matchId, {
      status: "done",
      opponentId: userId,
      opponentName: name,
      opponentPick,
      winnerId: creatorWon ? m.creatorId : userId,
      winnerSide: flip,
      flippedAt: Date.now(),
    });

    return {
      flip,
      youWon: !creatorWon,
      creatorName: m.creatorName,
      bet: m.bet,
      winnerPayout: m.bet * 2,
    };
  },
});

/**
 * Creator-side settlement: pays the creator 2× bet on a win, refunds their
 * stake on a loss/cancel/expire — EXACTLY ONCE, enforced by the server flag.
 * The joiner settles from the `join` mutation's return value.
 */
export const settleCreator = mutation({
  args: { matchId: v.id("coinflipMatches") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const m = await ctx.db.get(args.matchId);
    if (!m || m.creatorId !== userId) throw new ConvexError("Match not found.");
    if (m.creatorSettled) {
      return { already: true, pending: false, payout: 0, refunded: false, won: null };
    }

    if (m.status === "done") {
      const won = m.winnerId === userId;
      await ctx.db.patch(args.matchId, { creatorSettled: true });
      // Win: stake back + opponent's stake. Loss: nothing back (stake lost).
      return { already: false, pending: false, payout: won ? m.bet * 2 : 0, refunded: false, won };
    }
    if (m.status === "cancelled") {
      await ctx.db.patch(args.matchId, { creatorSettled: true });
      // Expired/cancelled: full refund of the stake.
      return { already: false, pending: false, payout: m.bet, refunded: true, won: null };
    }
    return { already: false, pending: true, payout: 0, refunded: false, won: null };
  },
});
