import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Track definitions (must match client) ──

export interface TrackDef {
  id: string;
  name: string;
  /** Checkpoints as {x,y} pairs. Last checkpoint = finish line. */
  checkpoints: { x: number; y: number }[];
  /** Car spawn positions [{x,y,angle}] for up to 8 players. */
  spawns: { x: number; y: number; angle: number }[];
  /** Track boundaries (simple AABB for now). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Lap count for the race. */
  laps: number;
}

export const TRACKS: TrackDef[] = [
  {
    id: "city-circuit",
    name: "City Circuit",
    checkpoints: [
      { x: 400, y: 150 },
      { x: 750, y: 200 },
      { x: 800, y: 450 },
      { x: 600, y: 650 },
      { x: 300, y: 600 },
      { x: 200, y: 350 },
    ],
    spawns: [
      { x: 350, y: 200, angle: 0 },
      { x: 320, y: 240, angle: 0 },
      { x: 350, y: 280, angle: 0 },
      { x: 320, y: 320, angle: 0 },
      { x: 350, y: 360, angle: 0 },
      { x: 320, y: 400, angle: 0 },
      { x: 350, y: 440, angle: 0 },
      { x: 320, y: 480, angle: 0 },
    ],
    bounds: { minX: 100, minY: 100, maxX: 900, maxY: 700 },
    laps: 3,
  },
  {
    id: "speed-ring",
    name: "Speed Ring",
    checkpoints: [
      { x: 500, y: 120 },
      { x: 820, y: 250 },
      { x: 750, y: 550 },
      { x: 300, y: 600 },
      { x: 180, y: 300 },
    ],
    spawns: [
      { x: 460, y: 170, angle: 0.3 },
      { x: 430, y: 210, angle: 0.3 },
      { x: 460, y: 250, angle: 0.3 },
      { x: 430, y: 290, angle: 0.3 },
      { x: 460, y: 330, angle: 0.3 },
      { x: 430, y: 370, angle: 0.3 },
      { x: 460, y: 410, angle: 0.3 },
      { x: 430, y: 450, angle: 0.3 },
    ],
    bounds: { minX: 80, minY: 60, maxX: 920, maxY: 680 },
    laps: 3,
  },
];

function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

// ── Queries ──

/** List open lobbies (status = "waiting"). */
export const listLobbies = query({
  args: {},
  handler: async (ctx) => {
    const lobbies = await ctx.db
      .query("raceLobbies")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .collect();

    const result = [];
    for (const lobby of lobbies) {
      const players = await ctx.db
        .query("racePlayers")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
        .collect();
      result.push({
        ...lobby,
        playerCount: players.length,
        trackName: getTrack(lobby.trackId).name,
      });
    }
    return result;
  },
});

/** Get full lobby state including all player positions. */
export const getLobby = query({
  args: { lobbyId: v.id("raceLobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return null;

    const players = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();

    return {
      ...lobby,
      track: getTrack(lobby.trackId),
      players,
    };
  },
});

/** Get my current lobby (if any). */
export const getMyLobby = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const myPlayer = await ctx.db
      .query("racePlayers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!myPlayer) return null;

    const lobby = await ctx.db.get(myPlayer.lobbyId);
    if (!lobby) return null;

    const players = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
      .collect();

    return {
      ...lobby,
      track: getTrack(lobby.trackId),
      players,
    };
  },
});

// ── Mutations ──

/** Create a new race lobby. */
export const createLobby = mutation({
  args: { trackId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const name = user?.name ?? user?.email ?? "Racer";

    // Leave any existing lobby first
    const existing = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby_user", (q) =>
        q.eq("lobbyId", "dummy" as any).eq("userId", userId),
      )
      .first();
    // Manual cleanup: find any player row for this user
    const allMy = await ctx.db
      .query("racePlayers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const p of allMy) {
      await ctx.db.delete(p._id);
    }

    const track = getTrack(args.trackId);
    const lobbyId = await ctx.db.insert("raceLobbies", {
      hostId: userId,
      hostName: name,
      status: "waiting",
      trackId: args.trackId,
      createdAt: Date.now(),
    });

    const spawn = track.spawns[0];
    await ctx.db.insert("racePlayers", {
      lobbyId,
      userId,
      playerName: name,
      carId: "starter",
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      speed: 0,
      lap: 0,
      finished: false,
      lastUpdate: Date.now(),
    });

    return lobbyId;
  },
});

/** Join an existing lobby. */
export const joinLobby = mutation({
  args: { lobbyId: v.id("raceLobbies"), carId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || lobby.status !== "waiting") throw new Error("Lobby not available");

    const user = await ctx.db.get(userId);
    const name = user?.name ?? user?.email ?? "Racer";

    // Clean up any existing player rows for this user
    const allMy = await ctx.db
      .query("racePlayers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const p of allMy) {
      await ctx.db.delete(p._id);
    }

    const existingPlayers = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();

    if (existingPlayers.length >= 8) throw new Error("Lobby full");

    const track = getTrack(lobby.trackId);
    const spawnIdx = Math.min(existingPlayers.length, track.spawns.length - 1);
    const spawn = track.spawns[spawnIdx];

    await ctx.db.insert("racePlayers", {
      lobbyId: args.lobbyId,
      userId,
      playerName: name,
      carId: args.carId,
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      speed: 0,
      lap: 0,
      finished: false,
      lastUpdate: Date.now(),
    });
  },
});

/** Host starts the race (3-second countdown). */
export const startCountdown = mutation({
  args: { lobbyId: v.id("raceLobbies") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || lobby.hostId !== userId) throw new Error("Not host");
    if (lobby.status !== "waiting") throw new Error("Already started");

    await ctx.db.patch(args.lobbyId, {
      status: "countdown",
      countdownEnds: Date.now() + 3000,
    });
  },
});

/** Update my car position (called every frame). */
export const updatePosition = mutation({
  args: {
    lobbyId: v.id("raceLobbies"),
    x: v.number(),
    y: v.number(),
    angle: v.number(),
    speed: v.number(),
    lap: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || lobby.status !== "racing") return;

    const players = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby_user", (q) =>
        q.eq("lobbyId", args.lobbyId).eq("userId", userId),
      )
      .collect();

    if (players.length === 0) return;

    await ctx.db.patch(players[0]._id, {
      x: args.x,
      y: args.y,
      angle: args.angle,
      speed: args.speed,
      lap: args.lap,
      lastUpdate: Date.now(),
    });
  },
});

/** Mark myself as finished. */
export const finishRace = mutation({
  args: { lobbyId: v.id("raceLobbies"), finishTime: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const players = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby_user", (q) =>
        q.eq("lobbyId", args.lobbyId).eq("userId", userId),
      )
      .collect();

    if (players.length === 0 || players[0].finished) return;

    // Count how many already finished to get placement
    const allPlayers = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();

    const finishedCount = allPlayers.filter((p) => p.finished).length;

    await ctx.db.patch(players[0]._id, {
      finished: true,
      finishTime: args.finishTime,
      placement: finishedCount + 1,
    });

    // If all players finished, close the lobby
    const newFinished = finishedCount + 1;
    if (newFinished >= allPlayers.length) {
      await ctx.db.patch(args.lobbyId, {
        status: "finished",
        raceEnds: Date.now(),
      });
    }
  },
});

/** Host transitions lobby from countdown to racing. */
export const beginRace = mutation({
  args: { lobbyId: v.id("raceLobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return;
    if (lobby.status !== "countdown") return;
    // Anyone can trigger this once countdown expires
    await ctx.db.patch(args.lobbyId, { status: "racing" });
  },
});

/** Leave the current lobby. */
export const leaveLobby = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const allMy = await ctx.db
      .query("racePlayers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const p of allMy) {
      await ctx.db.delete(p._id);

      // If host left, check if lobby should be deleted
      const lobby = await ctx.db.get(p.lobbyId);
      if (lobby && lobby.hostId === userId) {
        const remaining = await ctx.db
          .query("racePlayers")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", p.lobbyId))
          .collect();
        if (remaining.length === 0) {
          await ctx.db.delete(p.lobbyId);
        }
      }
    }
  },
});

/** Delete a lobby (host only). */
export const deleteLobby = mutation({
  args: { lobbyId: v.id("raceLobbies") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || lobby.hostId !== userId) return;

    // Delete all players
    const players = await ctx.db
      .query("racePlayers")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();
    for (const p of players) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(args.lobbyId);
  },
});

/** Cleanup stale lobbies older than 5 minutes. */
export const cleanupStaleLobbies = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 5 * 60_000;
    const stale = await ctx.db
      .query("raceLobbies")
      .filter((q) =>
        q.or(
          q.lt(q.field("createdAt"), cutoff),
          q.eq(q.field("status"), "finished"),
        ),
      )
      .collect();
    for (const lobby of stale) {
      const players = await ctx.db
        .query("racePlayers")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
        .collect();
      for (const p of players) {
        await ctx.db.delete(p._id);
      }
      await ctx.db.delete(lobby._id);
    }
    return stale.length;
  },
});
