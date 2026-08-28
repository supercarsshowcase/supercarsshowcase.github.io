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
import type { CrateResult, DealerDef, GameState, SpinResult } from "./types";

const SAVE_KEY = "supercars.game.v1";
const STORAGE_VERSION = 1;

/** The Lucky Spin wheel is free once every 15 minutes. */
export const SPIN_COOLDOWN_MS = 15 * 60_000;
/** Chance the wheel lands on a supercar (0.3%). */
export const SPIN_CAR_CHANCE = 0.003;
/** 97.8% income nerf applied globally to all cars. */
const INCOME_NERF = 0.022;
/** Upgrade costs are 80x more expensive. */
const UPGRADE_COST_MULT = 80;
/** Upgrade effects are 20x weaker. */
const UPGRADE_EFFECT_MULT = 0.05;
/** Crate costs are 50x more expensive. */
const CRATE_COST_MULT = 50;
/** Spin cash rewards are 3% of original (10x nerf). */
const SPIN_REWARD_MULT = 0.03;

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
    cash: 0,
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
    daily: { nextClaimAt: 0, lastClaimAt: 0, streak: 0 },
    clicksOnStarter: 0,
    lastTick: now,
    lastSpinAt: 0,
    freeSpins: 0,
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
      out.clickMult += (fx.clickMult ?? 0) * UPGRADE_EFFECT_MULT;
      out.passiveMult += (fx.passiveMult ?? 0) * UPGRADE_EFFECT_MULT;
      out.valueMult += (fx.valueMult ?? 0) * UPGRADE_EFFECT_MULT;
      out.hpMult += (fx.hpMult ?? 0) * UPGRADE_EFFECT_MULT;
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
  const prestige = 1 + 0.05 * state.prestigeLevel;
  const parts = 1 + partBonus(state, "clickMult");
  const collect = 1 + collectionBonus(state, "click");
  return prestige * parts * collect;
}

/** Global passive income multiplier: prestige + garage + parts + collections. */
export function passiveMultiplier(state: GameState): number {
  const prestige = 1 + 0.05 * state.prestigeLevel;
  const garage = 1 + 0.005 * (levelFrom(state) - 1);
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

/** Secret cars are trophies: they can't be sold for cash either. */
export function isSecretCar(carId: string): boolean {
  return Boolean(GAME_CAR_MAP[carId]?.secret);
}

export function clickValue(state: GameState): number {
  const def = GAME_CAR_MAP[state.activeCarId];
  if (!def) return 1;
  // Secret cars are display trophies — they never earn money.
  if (def.secret) return 1;
  const cond = conditionOf(state, state.activeCarId);
  const condMult = 0.5 + 0.5 * cond;
  const mults = carUpgradeMults(state, state.activeCarId);
  const base = def.value * 0.0003 * INCOME_NERF;
  return Math.max(1, Math.round(base * (1 + mults.clickMult) * condMult * clickMultiplier(state)));
}

export function passivePerSec(state: GameState): number {
  let base = 0;
  for (const carId of Object.keys(state.ownedCars)) {
    const def = GAME_CAR_MAP[carId];
    if (!def || def.secret) continue; // secret cars never generate income
    const cond = conditionOf(state, carId);
    const condMult = 0.5 + 0.5 * cond;
    const mults = carUpgradeMults(state, carId);
    base += def.value * 0.000003 * INCOME_NERF * (1 + mults.passiveMult) * condMult;
  }
  return base * passiveMultiplier(state);
}

export function upgradeCost(state: GameState, carId: string, upgradeId: string): number {
  const def = GAME_CAR_MAP[carId];
  const up = UPGRADE_MAP[upgradeId];
  if (!def || !up) return Infinity;
  const stage = state.ownedCars[carId]?.upgrades[upgradeId] ?? 0;
  if (stage >= up.stages.length) return Infinity;
  const tier = Math.min(2_000_000, Math.max(1, Math.pow(def.value / 10_000, 0.8)));
  return Math.max(1, Math.round(up.stages[stage].cost * tier * UPGRADE_COST_MULT));
}

export function buyPrice(defId: string): number {
  return GAME_CAR_MAP[defId]?.value ?? 0;
}

/** Actual cost the player pays to open a crate (base cost × multiplier). */
export function crateCost(crateId: string): number {
  const crate = CRATE_MAP[crateId];
  if (!crate) return Infinity;
  return crate.cost * CRATE_COST_MULT;
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
  scrapyard: 0.01,
  import: 0.02,
  dealer: 0.04,
  exotic: 0.06,
  mythic: 0.08,
  vault: 0.12,
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

// ── Lucky Spin wheel ──────────────────────────────────────────────────────────

/** Cash values on the wheel, growing with player level (slice 0 is the car). */
const SPIN_CASH_BASE = [2, 5, 10, 20, 40, 80, 160, 300, 500];

export function spinCashSlices(state: GameState): number[] {
  const scale = 1 + (levelFrom(state) - 1) * 0.15;
  return SPIN_CASH_BASE.map((v) => Math.round(v * scale * SPIN_REWARD_MULT));
}

/** When the wheel becomes free to spin again. */
export function spinReadyAt(state: GameState): number {
  if (state.freeSpins > 0) return 0; // free spins are always ready
  return state.lastSpinAt + SPIN_COOLDOWN_MS;
}

/** Tier 1: Legendary+ non-secret cars worth $10M–$30M (1% chance) */
export function spinSupercarPool() {
  return Object.values(GAME_CAR_MAP).filter(
    (c) => !c.secret && c.value >= 10_000_000 && c.value <= 30_000_000,
  );
}

/** Tier 2: Mythic cars worth $100M–$300M (0.01% chance) */
export function spinSupercarPool01() {
  return Object.values(GAME_CAR_MAP).filter(
    (c) => !c.secret && c.value >= 100_000_000 && c.value <= 300_000_000,
  );
}

/** Tier 3: Ultra-rare $1B car (0.001% chance) */
export function spinSupercarPool001() {
  return Object.values(GAME_CAR_MAP).filter(
    (c) => !c.secret && c.value >= 500_000_000,
  );
}

const HOUR_MS = 3_600_000;

/** Hourly featured car for each tier (deterministic, rotates every hour). */
export function hourlySupercar(now: number) {
  const pool = spinSupercarPool();
  if (pool.length === 0) return undefined;
  return pool[Math.floor(now / HOUR_MS) % pool.length];
}

export function hourlySupercar01(now: number) {
  const pool = spinSupercarPool01();
  if (pool.length === 0) return undefined;
  return pool[Math.floor(now / HOUR_MS) % pool.length];
}

export function hourlySupercar001(now: number) {
  const pool = spinSupercarPool001();
  if (pool.length === 0) return undefined;
  return pool[Math.floor(now / HOUR_MS) % pool.length];
}

/** Next hour boundary — when all tier jackpot cars rotate. */
export function nextSupercarSwapAt(now: number): number {
  return (Math.floor(now / HOUR_MS) + 1) * HOUR_MS;
}

/**
 * Roll the wheel with 3 car tiers:
 *   0.001% → $1B+ tier 3 car
 *   0.01%  → $100–300M tier 2 car
 *   1%     → $10–30M tier 1 car
 *   else   → cash slice
 */
/** Physical slice indices reserved for cash (not car slices 0, 4, 8). */
const CASH_SLICE_INDICES = [1, 2, 3, 5, 6, 7, 9, 10, 11];

export function rollSpin(state: GameState, now = Date.now()): SpinResult {
  const roll = Math.random();
  // Tier 3 (0.001%) → slice 8 (special gold)
  if (roll < 0.00001) {
    const car = hourlySupercar001(now);
    if (car) return { kind: "car", carId: car.id, slice: 8, tier: 3 };
  }
  // Tier 2 (0.01%) → slice 4 (purple)
  if (roll < 0.00011) {
    const car = hourlySupercar01(now);
    if (car) return { kind: "car", carId: car.id, slice: 4, tier: 2 };
  }
  // Tier 1 (1%) → slice 0 (gold)
  if (roll < 0.01011) {
    const car = hourlySupercar(now);
    if (car) return { kind: "car", carId: car.id, slice: 0, tier: 1 };
  }
  const slices = spinCashSlices(state);
  const idx = Math.floor(Math.random() * slices.length);
  return { kind: "cash", amount: slices[idx], slice: CASH_SLICE_INDICES[idx] };
}

// ── Daily reward ──────────────────────────────────────────────────────────────

export function dailyReward(state: GameState, now: number): number {
  const streak =
    state.daily.lastClaimAt > 0 && now - state.daily.lastClaimAt <= 86_400_000
      ? state.daily.streak + 1
      : 1;
  const mult = Math.min(streak, 14);
  return Math.round(10 * Math.pow(1.25, mult - 1) * (1 + state.prestigeLevel * 0.2) * 0.2);
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
  | { type: "CLICK"; amount: number; globalMultiplier?: number }
  | { type: "TICK"; now: number; globalMultiplier?: number }
  | { type: "BUY_CAR"; id: string }
  | { type: "ADD_CASH"; amount: number }
  | { type: "ADD_CAR"; carId: string }
  | { type: "REMOVE_CAR"; carId: string }
  | { type: "SELL_CAR"; id: string }
  | { type: "SET_ACTIVE"; id: string }
  | { type: "BUY_UPGRADE"; upgradeId: string }
  | { type: "OPEN_CRATE"; crateId: string; result: CrateResult }
  | { type: "SELL_PART"; partId: string }
  | { type: "CLAIM_DAILY"; reward: number; now?: number }
  | { type: "SPIN"; now: number; result: SpinResult }
  | { type: "REFRESH_DEALER"; dealerId: string; stock: string[]; refreshAt: number; cost: number }
  | { type: "PRESTIGE" }
  | { type: "HARD_RESET" }
  | { type: "RESET_PROGRESS"; resetOptions: Record<string, boolean> }
  | { type: "GIVE_SPINS"; amount: number }
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
      const next = {
        ...state,
        cash: state.cash + amount,
        totalEarned: state.totalEarned + amount,
        totalClicks: state.totalClicks + 1,
        clicksOnStarter: nextClicks,
        lastTick: Date.now(),
      };
      return applyAchievements(next);
    }
    case "TICK": {
      const dt = Math.min(28_800, Math.max(0, (action.now - state.lastTick) / 1000));
      const raw = passivePerSec(state) * dt;
      const mult = action.globalMultiplier ?? 1;
      const gain = Math.floor(raw * mult);
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
    case "REMOVE_CAR": {
      if (!state.ownedCars[action.carId]) return state;
      if (isSecretCar(action.carId)) return state;
      if (Object.keys(state.ownedCars).length <= 1) return state;
      const ownedCars = { ...state.ownedCars };
      delete ownedCars[action.carId];
      const activeCarId = state.activeCarId === action.carId ? (Object.keys(ownedCars)[0] ?? STARTER_ID) : state.activeCarId;
      return { ...state, ownedCars, activeCarId };
    }
    case "SELL_CAR": {
      if (!state.ownedCars[action.id]) return state;
      if (isSecretCar(action.id)) return state; // trophies can't be cashed out
      if (Object.keys(state.ownedCars).length <= 1) return state;
      const gain = Math.round(carValue(state, action.id) * 0.35);
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
      if (!crate) return state;
      const actualCrateCost = crate.cost * CRATE_COST_MULT;
      if (state.cash < actualCrateCost) return state;
      let cash = state.cash - actualCrateCost;
      let ownedCars = state.ownedCars;
      let inventory = state.inventory;
      const r = action.result;
      if (r.kind === "car" && r.carId) {
        const def = GAME_CAR_MAP[r.carId];
        if (def && ownedCars[r.carId]) {
          cash += Math.round(def.value * 0.2);
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
      const now = action.now ?? Date.now();
      if (now < state.daily.nextClaimAt) return state;
      const streak =
        state.daily.lastClaimAt > 0 && now - state.daily.lastClaimAt <= 86_400_000
          ? state.daily.streak + 1
          : 1;
      return {
        ...state,
        cash: state.cash + action.reward,
        daily: {
          nextClaimAt: now + 12 * 3_600_000,
          lastClaimAt: now,
          streak,
        },
      };
    }
    case "SPIN": {
      const hasFreeSpin = state.freeSpins > 0;
      if (!hasFreeSpin && action.now < state.lastSpinAt + SPIN_COOLDOWN_MS) return state;
      const nextFreeSpins = hasFreeSpin ? state.freeSpins - 1 : state.freeSpins;
      const r = action.result;
      if (r.kind === "car" && r.carId) {
        const def = GAME_CAR_MAP[r.carId];
        if (!def) return { ...state, lastSpinAt: action.now, freeSpins: nextFreeSpins };
        if (state.ownedCars[r.carId]) {
          return applyAchievements({
            ...state,
            cash: state.cash + Math.round(def.value * 0.2),
            lastSpinAt: action.now,
            freeSpins: nextFreeSpins,
          });
        }
        return applyAchievements({
          ...state,
          ownedCars: { ...state.ownedCars, [r.carId]: { upgrades: {} } },
          lastSpinAt: action.now,
          freeSpins: nextFreeSpins,
        });
      }
      return applyAchievements({
        ...state,
        cash: state.cash + (r.amount ?? 0),
        lastSpinAt: action.now,
        freeSpins: nextFreeSpins,
      });
    }
    case "REFRESH_DEALER":
      return {
        ...state,
        cash: state.cash - action.cost,
        dealerStock: { ...state.dealerStock, [action.dealerId]: action.stock },
        dealerRefreshAt: action.refreshAt,
      };
    case "PRESTIGE": {
      const requirement = 5000 * (state.prestigeLevel + 1);
      if (state.reputation < requirement) return state;
      return normalize(state, {
        ...initialGameState(),
        prestigeLevel: state.prestigeLevel + 1,
        achievements: state.achievements,
        totalEarned: 0,
        lastTick: Date.now(),
      });
    }
    case "GIVE_SPINS":
      return { ...state, freeSpins: state.freeSpins + Math.max(0, Math.round(action.amount)) };

    case "HARD_RESET":
      return initialGameState();
    case "RESET_PROGRESS": {
      const opts = action.resetOptions;
      const fresh = initialGameState();
      // When upgrading, strip all upgrades from owned cars (keep the cars themselves).
      let ownedCars = state.ownedCars;
      if (opts.upgrades) {
        const stripped: Record<string, { upgrades: Record<string, number> }> = {};
        for (const [id, owned] of Object.entries(ownedCars)) {
          stripped[id] = { upgrades: {} };
        }
        ownedCars = stripped;
      }
      return {
        ...state,
        cash: opts.cash ? 0 : state.cash,
        ownedCars: opts.cars
          ? { [state.activeCarId]: state.ownedCars[state.activeCarId] ?? { upgrades: {} } }
          : ownedCars,
        inventory: opts.parts ? {} : state.inventory,
        prestigeLevel: opts.prestige ? 0 : state.prestigeLevel,
        reputation: opts.prestige ? 0 : state.reputation,
        achievements: opts.achievements ? [] : state.achievements,
        totalEarned: opts.cash ? 0 : state.totalEarned,
        totalClicks: opts.cash ? 0 : state.totalClicks,
        daily: opts.daily ? fresh.daily : state.daily,
        cratesOpened: opts.upgrades ? 0 : state.cratesOpened,
        dealerStock: opts.upgrades ? fresh.dealerStock : state.dealerStock,
        dealerRefreshAt: opts.upgrades ? fresh.dealerRefreshAt : state.dealerRefreshAt,
        lastSpinAt: opts.casino ? 0 : state.lastSpinAt,
        freeSpins: opts.casino ? 0 : state.freeSpins,
      };
    }
    case "ADD_CASH": {
      const amount = Math.round(action.amount);
      const newCash = Math.max(0, state.cash + amount);
      return applyAchievements({
        ...state,
        cash: newCash,
        totalEarned: amount > 0 ? state.totalEarned + amount : state.totalEarned,
      });
    }
    case "ADD_CAR": {
      if (state.ownedCars[action.carId]) return state;
      if (!GAME_CAR_MAP[action.carId]) return state;
      return applyAchievements({
        ...state,
        ownedCars: { ...state.ownedCars, [action.carId]: { upgrades: {} } },
      });
    }
    case "LOAD":
      return normalize(state, action.state);
    default:
      return state;
  }
}

/** Merge a loaded save over the defaults defensively. */
function normalize(current: GameState, loaded: Partial<GameState>): GameState {
  const base = {
    ...initialGameState(),
    ...loaded,
    ownedCars: loaded.ownedCars ?? current.ownedCars,
    inventory: loaded.inventory ?? current.inventory,
    daily: { ...initialGameState().daily, ...(loaded.daily ?? {}) },
  };
  // Fill any dealer that has no stock yet (old saves predate stock seeding).
  const dealerStock: Record<string, string[]> = {};
  for (const d of DEALERS) {
    const stock = base.dealerStock?.[d.id];
    dealerStock[d.id] = stock && stock.length > 0 ? stock : rollDealerStock(d);
  }
  return { ...base, dealerStock };
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


