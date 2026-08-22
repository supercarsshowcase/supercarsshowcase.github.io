import {
  ACHIEVEMENTS,
  CRATE_MAP,
  DEALERS,
  GAME_CAR_MAP,
  PARTS,
  PART_MAP,
  STARTER_ID,
  SECRET_CAR_ID,
  UPGRADE_MAP,
  levelFrom,
  rarityIndex,
} from "./data";
import type { CrateResult, DealerDef, GameState, Rarity } from "./types";

const SAVE_KEY = "supercars.game.v1";
const STORAGE_VERSION = 1;

// ── Initial state ─────────────────────────────────────────────────────────────

/** Roll a fresh batch of stock for a dealer from its curated pool. */
export function rollDealerStock(dealer: DealerDef): string[] {
  const pool = dealer.pool.filter((id) => GAME_CAR_MAP[id]);
  const out: string[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < dealer.slots && pool.length > 0 && guard < 200) {
    guard += 1;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(pick)) {
      used.add(pick);
      out.push(pick);
    } else if (used.size >= pool.length) {
      break;
    }
  }
  return out;
}

export function initialGameState(): GameState {
  const now = Date.now();
  const dealerStock: Record<string, string[]> = {};
  for (const d of DEALERS) dealerStock[d.id] = rollDealerStock(d);
  return {
    version: STORAGE_VERSION,
    cash: 120,
    reputation: 0,
    prestigeLevel: 0,
    activeCarId: STARTER_ID,
    ownedCars: { [STARTER_ID]: { upgrades: {} } },
    inventory: {},
    cratesOpened: 0,
    totalClicks: 0,
    totalEarned: 0,
    achievements: [],
    dealerRefreshAt: now,
    dealerStock,
    daily: { day: "", streak: 0 },
    clicksOnStarter: 0,
    lastTick: now,
  };
}

// ── Core math ─────────────────────────────────────────────────────────────────

/** Multipliers from the active car's owned upgrade stages, per stat. */
function carUpgradeMults(state: GameState, carId: string) {
  const owned = state.ownedCars[carId];
  const out = { clickMult: 0, passiveMult: 0, valueMult: 0, hpMult: 0 };
  if (!owned) return out;
  for (const [uid, stage] of Object.entries(owned.upgrades)) {
    const def = UPGRADE_MAP[uid];
    if (!def || stage < 1) continue;
    for (let i = 0; i < Math.min(stage, def.stages.length); i++) {
      const fx = def.stages[i].effect;
      out.clickMult += fx.clickMult ?? 0;
      out.passiveMult += fx.passiveMult ?? 0;
      out.valueMult += fx.valueMult ?? 0;
      out.hpMult += fx.hpMult ?? 0;
    }
  }
  return out;
}

function conditionOf(state: GameState, carId: string): number {
  return (state.ownedCars[carId]?.upgrades.condition ?? 0) / 6;
}

export function carValue(state: GameState, carId: string): number {
  const def = GAME_CAR_MAP[carId];
  if (!def) return 0;
  const cond = conditionOf(state, carId);
  const condMult = 0.45 + 0.55 * cond;
  const mults = carUpgradeMults(state, carId);
  return Math.round(def.value * (1 + mults.valueMult) * condMult);
}

export function carClickValue(state: GameState, carId: string): number {
  const def = GAME_CAR_MAP[carId];
  if (!def) return 0;
  const cond = conditionOf(state, carId);
  const condMult = 0.5 + 0.5 * cond;
  const mults = carUpgradeMults(state, carId);
  return Math.max(1, Math.round(def.value * 0.0012 * (1 + mults.clickMult) * condMult * clickMultiplier(state)));
}

export function carPower(state: GameState, carId: string): number {
  const def = GAME_CAR_MAP[carId];
  if (!def) return 0;
  const cond = conditionOf(state, carId);
  const hp = def.hp * (0.55 + 0.45 * cond);
  const mults = carUpgradeMults(state, carId);
  return Math.round(hp * (1 + mults.hpMult));
}

/** Global click multiplier: prestige + parts + collections. */
export function clickMultiplier(state: GameState): number {
  const prestige = 1 + 0.5 * state.prestigeLevel;
  const parts = 1 + partBonus(state, "clickMult");
  const collect = 1 + collectionBonus(state, "click");
  return prestige * parts * collect;
}

/** Global passive income multiplier: prestige + garage + parts + collections. */
export function passiveMultiplier(state: GameState): number {
  const prestige = 1 + 0.5 * state.prestigeLevel;
  const garage = 1 + 0.05 * (levelFrom(state) - 1);
  const parts = 1 + partBonus(state, "passiveMult");
  const collect = 1 + collectionBonus(state, "passive");
  return prestige * garage * parts * collect;
}

function partBonus(state: GameState, key: "clickMult" | "passiveMult"): number {
  let total = 0;
  for (const [pid, count] of Object.entries(state.inventory)) {
    const def = PART_MAP[pid];
    if (!def || !count) continue;
    total += (def[key] ?? 0) * count;
  }
  return total;
}

/** Small permanent bonuses for completing manufacturer/rarity collections. */
function collectionBonus(state: GameState, kind: "click" | "passive"): number {
  const owned = (ids: string[]) => ids.every((id) => state.ownedCars[id]);
  let bonus = 0;
  if (owned(["veyron-16-4", "chiron-17", "tourbillon-26"])) bonus += 0.3;
  if (owned(["ferrari-458-12", "laferrari-14", "daytona-sp3-22"])) bonus += 0.2;
  if (owned(["huracan-15", "aventador-17", "revuelto-23", "veneno-14"])) bonus += 0.25;
  if (kind === "passive") {
    const hyperCount = Object.keys(state.ownedCars).filter(
      (id) => rarityIndex(GAME_CAR_MAP[id]?.rarity ?? "common") >= 6,
    ).length;
    if (hyperCount >= 4) bonus += 0.5;
  } else {
    if (Object.keys(state.ownedCars).length >= 40) bonus += 0.4;
  }
  return bonus;
}

export function clickValue(state: GameState): number {
  const def = GAME_CAR_MAP[state.activeCarId];
  if (!def) return 1;
  const cond = conditionOf(state, state.activeCarId);
  const condMult = 0.5 + 0.5 * cond;
  const mults = carUpgradeMults(state, state.activeCarId);
  const base = def.value * 0.0012;
  return Math.max(1, Math.round(base * (1 + mults.clickMult) * condMult * clickMultiplier(state)));
}

export function passivePerSec(state: GameState): number {
  let base = 0;
  for (const carId of Object.keys(state.ownedCars)) {
    const def = GAME_CAR_MAP[carId];
    if (!def) continue;
    const cond = conditionOf(state, carId);
    const condMult = 0.5 + 0.5 * cond;
    const mults = carUpgradeMults(state, carId);
    base += def.value * 0.00005 * (1 + mults.passiveMult) * condMult;
  }
  return base * passiveMultiplier(state);
}

export function upgradeCost(state: GameState, carId: string, upgradeId: string): number {
  const def = GAME_CAR_MAP[carId];
  const up = UPGRADE_MAP[upgradeId];
  if (!def || !up) return Infinity;
  const stage = state.ownedCars[carId]?.upgrades[upgradeId] ?? 0;
  if (stage >= up.stages.length) return Infinity;
  const tier = Math.min(2_000_000, Math.max(1, Math.pow(def.value / 10_000, 0.72)));
  return Math.max(1, Math.round(up.stages[stage].cost * tier));
}

export function buyPrice(defId: string): number {
  return GAME_CAR_MAP[defId]?.value ?? 0;
}

// ── Reward rolls (called from components, result applied via reducer) ─────────

function weightedPick<T>(entries: { value: T; weight: number }[]): T | undefined {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return undefined;
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1]?.value;
}

const CRATE_CAR_CHANCE: Record<string, number> = {
  scrapyard: 0.05,
  import: 0.09,
  dealer: 0.12,
  exotic: 0.16,
  mythic: 0.2,
  vault: 0.28,
};

export function rollCrate(state: GameState, crateId: string): CrateResult {
  const crate = CRATE_MAP[crateId];
  if (!crate) return { kind: "cash", cash: 0 };

  const roll = Math.random();
  const carChance = CRATE_CAR_CHANCE[crateId] ?? 0.2;

  if (roll < carChance) {
    const pool = Object.values(GAME_CAR_MAP).filter(
      (c) => c.crateTier > 0 && c.crateTier <= crate.maxTier && !c.secret,
    );
    const picked = weightedPick(
      pool.map((c) => ({ value: c, weight: crate.weights[c.rarity] ?? 0 })),
    );
    if (picked) return { kind: "car", carId: picked.id };
  } else if (roll < carChance + 0.5) {
    const partPool = PARTS.filter((p) => (crate.weights[p.rarity] ?? 0) > 0);
    const picked = weightedPick(
      partPool.map((p) => ({ value: p, weight: crate.weights[p.rarity] ?? 0 })),
    );
    if (picked) return { kind: "part", partId: picked.id };
  }

  const cash = Math.round(crate.cashMin + Math.random() * (crate.cashMax - crate.cashMin));
  return { kind: "cash", cash };
}

// ── Daily reward ──────────────────────────────────────────────────────────────

export function dailyReward(state: GameState, now: Date): number {
  const day = now.toDateString();
  const streak = state.daily.day === day ? state.daily.streak : state.daily.day === new Date(now.getTime() - 86400000).toDateString() ? state.daily.streak + 1 : 1;
  const mult = Math.min(streak, 14);
  return Math.round(100 * Math.pow(1.25, mult - 1) * (1 + state.prestigeLevel * 2));
}

// ── Achievements ──────────────────────────────────────────────────────────────

function newAchievements(state: GameState): { id: string; cash: number; rep: number }[] {
  const out: { id: string; cash: number; rep: number }[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    if (a.check(state)) out.push({ id: a.id, cash: a.rewardCash ?? 0, rep: a.rewardRep ?? 0 });
  }
  return out;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

export type Action =
  | { type: "CLICK"; amount: number }
  | { type: "TICK"; now: number }
  | { type: "BUY_CAR"; id: string }
  | { type: "SELL_CAR"; id: string }
  | { type: "SET_ACTIVE"; id: string }
  | { type: "BUY_UPGRADE"; upgradeId: string }
  | { type: "OPEN_CRATE"; crateId: string; result: CrateResult }
  | { type: "SELL_PART"; partId: string }
  | { type: "CLAIM_DAILY"; reward: number }
  | { type: "REFRESH_DEALER"; dealerId: string; stock: string[]; refreshAt: number; cost: number }
  | { type: "PRESTIGE" }
  | { type: "HARD_RESET" }
  | { type: "LOAD"; state: GameState };

function applyAchievements(s: GameState): GameState {
  const earned = newAchievements(s);
  if (earned.length === 0) return s;
  let cash = s.cash;
  let rep = s.reputation;
  for (const a of earned) {
    cash += a.cash;
    rep += a.rep;
  }
  return {
    ...s,
    cash,
    reputation: rep,
    achievements: [...s.achievements, ...earned.map((a) => a.id)],
  };
}

export function critChance(state: GameState): number {
  return Math.min(0.15, 0.05 + levelFrom(state) * 0.0004);
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "CLICK": {
      const amount = Math.max(1, Math.round(action.amount));
      const wasStarter = state.activeCarId === STARTER_ID;
      const nextClicks = state.clicksOnStarter + (wasStarter ? 1 : 0);
      const foundSecret = wasStarter && nextClicks >= 300 && !state.ownedCars[SECRET_CAR_ID];
      let next = {
        ...state,
        cash: state.cash + amount,
        totalEarned: state.totalEarned + amount,
        totalClicks: state.totalClicks + 1,
        clicksOnStarter: nextClicks,
        lastTick: Date.now(),
      };
      if (foundSecret) {
        next = {
          ...next,
          ownedCars: { ...next.ownedCars, [SECRET_CAR_ID]: { upgrades: {} } },
        };
      }
      return applyAchievements(next);
    }
    case "TICK": {
      const dt = Math.min(28_800, Math.max(0, (action.now - state.lastTick) / 1000));
      const gain = Math.floor(passivePerSec(state) * dt);
      if (gain <= 0) return { ...state, lastTick: action.now };
      return applyAchievements({
        ...state,
        cash: state.cash + gain,
        totalEarned: state.totalEarned + gain,
        lastTick: action.now,
      });
    }
    case "BUY_CAR": {
      const def = GAME_CAR_MAP[action.id];
      if (!def) return state;
      if (state.ownedCars[action.id]) return state;
      if (levelFrom(state) < def.unlockLevel) return state;
      const price = buyPrice(action.id);
      if (state.cash < price) return state;
      return applyAchievements({
        ...state,
        cash: state.cash - price,
        ownedCars: { ...state.ownedCars, [action.id]: { upgrades: {} } },
      });
    }
    case "SELL_CAR": {
      if (!state.ownedCars[action.id]) return state;
      if (Object.keys(state.ownedCars).length <= 1) return state;
      const gain = Math.round(carValue(state, action.id) * 0.45);
      const ownedCars = { ...state.ownedCars };
      delete ownedCars[action.id];
      const activeCarId =
        state.activeCarId === action.id
          ? (Object.keys(ownedCars)[0] ?? STARTER_ID)
          : state.activeCarId;
      return applyAchievements({ ...state, cash: state.cash + gain, ownedCars, activeCarId });
    }
    case "SET_ACTIVE":
      return state.ownedCars[action.id] ? { ...state, activeCarId: action.id } : state;
    case "BUY_UPGRADE": {
      const cost = upgradeCost(state, state.activeCarId, action.upgradeId);
      if (cost === Infinity || state.cash < cost) return state;
      const owned = state.ownedCars[state.activeCarId];
      return applyAchievements({
        ...state,
        cash: state.cash - cost,
        ownedCars: {
          ...state.ownedCars,
          [state.activeCarId]: {
            ...owned,
            upgrades: {
              ...owned.upgrades,
              [action.upgradeId]: (owned.upgrades[action.upgradeId] ?? 0) + 1,
            },
          },
        },
      });
    }
    case "OPEN_CRATE": {
      const crate = CRATE_MAP[action.crateId];
      if (!crate || state.cash < crate.cost) return state;
      let cash = state.cash - crate.cost;
      let ownedCars = state.ownedCars;
      let inventory = state.inventory;
      const r = action.result;
      if (r.kind === "car" && r.carId) {
        const def = GAME_CAR_MAP[r.carId];
        if (def && ownedCars[r.carId]) {
          cash += Math.round(def.value * 0.3);
        } else if (def) {
          ownedCars = { ...ownedCars, [r.carId]: { upgrades: {} } };
        }
      } else if (r.kind === "part" && r.partId) {
        inventory = { ...inventory, [r.partId]: (inventory[r.partId] ?? 0) + 1 };
      } else if (r.kind === "cash") {
        cash += r.cash ?? 0;
      }
      return applyAchievements({
        ...state,
        cash,
        ownedCars,
        inventory,
        cratesOpened: state.cratesOpened + 1,
      });
    }
    case "SELL_PART": {
      const count = state.inventory[action.partId] ?? 0;
      if (count <= 0) return state;
      const def = PART_MAP[action.partId];
      const inventory = { ...state.inventory };
      if (count === 1) delete inventory[action.partId];
      else inventory[action.partId] = count - 1;
      return { ...state, inventory, cash: state.cash + (def?.value ?? 0) };
    }
    case "CLAIM_DAILY": {
      const now = new Date();
      const day = now.toDateString();
      const streak =
        state.daily.day === day
          ? state.daily.streak
          : state.daily.day === new Date(now.getTime() - 86400000).toDateString()
            ? state.daily.streak + 1
            : 1;
      return {
        ...state,
        cash: state.cash + action.reward,
        daily: { day, streak },
      };
    }
    case "REFRESH_DEALER":
      return {
        ...state,
        cash: state.cash - action.cost,
        dealerStock: { ...state.dealerStock, [action.dealerId]: action.stock },
        dealerRefreshAt: action.refreshAt,
      };
    case "PRESTIGE": {
      const requirement = 2500 * (state.prestigeLevel + 1);
      if (state.reputation < requirement) return state;
      return {
        ...initialGameState(),
        prestigeLevel: state.prestigeLevel + 1,
        achievements: state.achievements,
        totalEarned: state.totalEarned,
        lastTick: Date.now(),
      };
    }
    case "HARD_RESET":
      return initialGameState();
    case "LOAD":
      return normalize(state, action.state);
    default:
      return state;
  }
}

/** Merge a loaded save over the defaults defensively. */
function normalize(current: GameState, loaded: Partial<GameState>): GameState {
  return {
    ...initialGameState(),
    ...loaded,
    ownedCars: loaded.ownedCars ?? current.ownedCars,
    inventory: loaded.inventory ?? current.inventory,
    dealerStock: loaded.dealerStock ?? {},
    daily: { ...initialGameState().daily, ...(loaded.daily ?? {}) },
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return initialGameState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return normalize(initialGameState(), parsed);
  } catch {
    return initialGameState();
  }
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ ...state, version: STORAGE_VERSION });
}

export function importSave(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as Partial<GameState>;
    if (!parsed || typeof parsed.cash !== "number") return null;
    return normalize(initialGameState(), parsed);
  } catch {
    return null;
  }
}

/** Rare rarity odds used by the crate reveal UI. */
export function rarityFromWeights(
  weights: Partial<Record<Rarity, number>>,
): Rarity | undefined {
  const entries = Object.entries(weights).map(([r, w]) => ({
    value: r as Rarity,
    weight: w as number,
  }));
  return weightedPick(entries);
}
