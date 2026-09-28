import { describe, test as it, expect } from "bun:test";
import {
  resolveSaveConflict,
  serializeSave,
  saveGame,
  loadGame,
  getDeviceId,
  initialGameState,
} from "./engine";
import { STARTER_ID } from "./data";
import type { GameState } from "./types";

// bun test has no localStorage (saveGame/loadGame guard it with try/catch),
// so stub an in-memory one to exercise the real persistence path.
const store = new Map<string, string>();
const g = globalThis as typeof globalThis & { localStorage?: unknown };
if (!g.localStorage) {
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  } as unknown as Storage;
}

/**
 * Cloud vs local save arbitration (resolveSaveConflict).
 *
 * Regression context: the old tiebreaker (`cloud.totalEarned >
 * local.totalEarned`) let a new device's starter-only autosave clobber the
 * player's real cloud save right after first login on that device —
 * "switched my acc to pc and it didnt give me the cars". PRESTIGE resets
 * totalEarned to 0 while keeping the garage, so totalEarned is not a progress
 * measure and "cloud total > local total" is meaningless between a fresh
 * device and a prestiged account.
 */

const base: GameState = initialGameState();

/** Starter-only save = what a brand-new device autosaves within seconds. */
const starterOnly = (over: Partial<GameState> = {}): Partial<GameState> => ({
  ...base,
  savedAt: 5_000,
  ...over,
});

/** A save with real play: extra car, money earned, reputation. */
const rich = (over: Partial<GameState> = {}): Partial<GameState> => ({
  ...base,
  savedAt: 5_000,
  ownedCars: {
    [STARTER_ID]: { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
    "civic-lx-95": { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
  },
  totalEarned: 250_000,
  reputation: 1_200,
  ...over,
});

describe("resolveSaveConflict", () => {
  it("a starter-only new-device save never clobbers a rich legacy cloud save (the reported bug)", () => {
    // Legacy cloud save: written before savedAt stamping existed, so no
    // savedAt — this is exactly what first login on a new PC used to face.
    const cloud = rich({ savedAt: undefined });
    const local = starterOnly({ savedAt: 9_000 }); // fresher, but empty
    expect(resolveSaveConflict(local, cloud)).toBe(cloud);
  });

  it("and vice versa: a fresh empty cloud save never rolls back real local progress", () => {
    const cloud = starterOnly({ savedAt: 9_000 });
    const local = rich({ savedAt: 5_000 });
    expect(resolveSaveConflict(local, cloud)).toBe(local);
  });

  it("fresh-session creep does NOT count as progress (clicks grant money+rep+achievements in seconds)", () => {
    // A few stray clicks on a new device before the cloud query resolved:
    // totalEarned < $1k, reputation > 0, first-click achievement — all three
    // used to make this save look "real" and win the timestamp tiebreak.
    const creeped: Partial<GameState> = {
      ...base,
      savedAt: 9_000,
      totalEarned: 500,
      reputation: 5,
      achievements: ["first-click"],
    };
    const cloud = rich({ savedAt: undefined }); // legacy, much older
    expect(resolveSaveConflict(creeped, cloud)).toBe(cloud);
  });

  it("totalEarned above the $1k lifetime threshold DOES count as progress", () => {
    // Crosses the threshold → real, so it beats a fresher but fake save.
    const groundDown = starterOnly({ totalEarned: 1_001, savedAt: 5_000 });
    const freshFake = starterOnly({ savedAt: 9_000 });
    expect(resolveSaveConflict(groundDown, freshFake)).toBe(groundDown);
    // Exactly at the threshold (> is strict) → still fake, loses to a real
    // legacy cloud save despite being fresher.
    const justBelow = starterOnly({ totalEarned: 1_000, savedAt: 9_000 });
    const legacyCloud = rich({ savedAt: undefined });
    expect(resolveSaveConflict(justBelow, legacyCloud)).toBe(legacyCloud);
  });

  it("real-progress guard works for legacy saves on BOTH sides", () => {
    // Prestiged local state: cars kept, totalEarned reset to 0, no stamp
    // (legacy), yet it must still beat a starter-only stamped cloud save.
    const prestigedLocal: Partial<GameState> = {
      ...base,
      ownedCars: {
        [STARTER_ID]: { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
        "civic-lx-95": { upgrades: {}, fuel: 100, clicksSinceFuel: 0 },
      },
      prestigeLevel: 3,
      totalEarned: 0,
    };
    const cloud = starterOnly({ savedAt: 9_000 });
    expect(resolveSaveConflict(prestigedLocal, cloud)).toBe(prestigedLocal);
  });

  it("same realness: the stamped (new-code) side wins over a legacy side", () => {
    const cloud = rich({ savedAt: undefined }); // legacy
    const local = rich({ savedAt: 5_000 }); // stamped, older content-wise
    expect(resolveSaveConflict(local, cloud)).toBe(local);
  });

  it("both stamped: newest write wins", () => {
    const local = rich({ savedAt: 5_000 });
    const cloud = rich({ savedAt: 6_000 });
    expect(resolveSaveConflict(local, cloud)).toBe(cloud);
  });

  it("both stamped: near-simultaneous cloud writes still win (skew tolerance), stale ones lose", () => {
    const local = rich({ savedAt: 100_000 });
    expect(resolveSaveConflict(local, rich({ savedAt: 100_000 - 60_000 }))).not.toBe(local);
    expect(resolveSaveConflict(local, rich({ savedAt: 100_000 - 120_000 }))).toBe(local);
  });

  it("both legacy: old totalEarned heuristic, ties keep local (no reload loop)", () => {
    const cloud = rich({ savedAt: undefined, totalEarned: 300_000 });
    const local = rich({ savedAt: undefined, totalEarned: 250_000 });
    expect(resolveSaveConflict(local, cloud)).toBe(cloud);
    expect(resolveSaveConflict(local, rich({ savedAt: undefined, totalEarned: 250_000 }))).toBe(
      local,
    );
  });

  it("missing sides resolve to whichever exists", () => {
    const local = rich({});
    expect(resolveSaveConflict(local, null)).toBe(local);
    expect(resolveSaveConflict(null, local)).toBe(local);
    expect(resolveSaveConflict(null, null)).toBeNull();
  });
});

describe("save stamping + round-trip", () => {
  it("serializeSave stamps savedAt and deviceId without dropping state", () => {
    const state = rich({ savedAt: undefined, deviceId: undefined }) as GameState;
    const parsed = JSON.parse(serializeSave(state)) as Partial<GameState>;
    expect(typeof parsed.savedAt).toBe("number");
    expect(parsed.savedAt as number).toBeGreaterThan(0);
    expect(typeof parsed.deviceId).toBe("string");
    expect((parsed.deviceId as string).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.ownedCars ?? {})).toContain("civic-lx-95");
    expect(parsed.totalEarned).toBe(250_000);
  });

  it("saveGame → loadGame round-trips cars and stamps (localStorage)", () => {
    const state = rich({ savedAt: undefined, deviceId: undefined }) as GameState;
    saveGame(state);
    const loaded = loadGame();
    expect(Object.keys(loaded.ownedCars)).toContain("civic-lx-95");
    expect(loaded.totalEarned).toBe(250_000);
    expect(typeof loaded.savedAt).toBe("number");
    // Arbitration consumes the persisted stamp: a freshly stamped local save
    // beats an equally-rich but older cloud save.
    const cloud = rich({ savedAt: (loaded.savedAt ?? 0) - 120_000 });
    expect(resolveSaveConflict(loaded, cloud)).toBe(loaded);
  });

  it("getDeviceId is stable across calls", () => {
    expect(getDeviceId()).toBe(getDeviceId());
  });
});
