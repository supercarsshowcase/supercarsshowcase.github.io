import {
  ACHIEVEMENTS,
  CRATE_MAP,
  DEALERS,
  GAME_CAR_MAP,
  PARTS,
  PART_MAP,
  STARTER_ID,
  SECRET_CAR_ID,
  SECRET_CAR_CLICKS,
  UPGRADE_MAP,
  getMonday,
  levelFrom,
  questUnit,
  rarityIndex,
  challengeMetric,
  generateWeeklyChallenges,
  initialWeeklyState,
} from "./data";
import type { CrateResult, DealerDef, GameCarDef, GameState, SpinResult, WeeklyState, WantedBounty } from "./types";

const SAVE_KEY = "supercars.game.v1";
const STORAGE_VERSION = 2;

/** The Lucky Spin wheel is free once every 30 minutes. */
export const SPIN_COOLDOWN_MS = 30 * 60_000;
/** Chance the wheel lands on a supercar (0.3%). */
export const SPIN_CAR_CHANCE = 0.003;
/**
 * Passive income: each owned car generates value × CAR_PASSIVE_RATE per second
 * (0.00002/s ≈ 7.2% of the car's value per hour — a mid garage pays for the
 * next car in an evening, so BUYING CARS is the core progression, not quests).
 */
export const CAR_PASSIVE_RATE = 0.00002;
/**
 * The starter hatchback is a hands-on bucket of bolts: it earns NOTHING
 * passively (fresh accounts start at exactly $0/s) and its click value is
 * pinned to exactly $1 (fresh accounts start at exactly $1/click). Restoring
 * it via the condition upgrade is the intended early loop, not income math.
 */
const STARTER_CLICK_VALUE = 1;
/** Upgrade costs: 16x base so early upgrades cost minutes of income, not days. */
const UPGRADE_COST_MULT = 16;
/** Upgrade effects run at half the designed strength. */
const UPGRADE_EFFECT_MULT = 0.5;
/** Crate costs are only mildly inflated above their (now scaled) base. */
const CRATE_COST_MULT = 3;
/** Spin cash rewards: slices scale with level, this keeps them a snack. */
const SPIN_REWARD_MULT = 0.05;
/**
 * Base cost to fully refuel any car, before level scaling (fuel is a mild
 * tax, not a wall). Scales with level so it never becomes pocket change
 * (see fuelCost).
 */
export const FUEL_COST = 200;
/** Maximum fuel level. */
export const FUEL_MAX = 100;
/** Fuel drains 1 unit every N clicks. */
const FUEL_DRAIN_INTERVAL = 100;
/** How many bounties to show at once. */
const WANTED_BOUNTY_COUNT = 3;
/** Bounty duration: 24 hours. */
const BOUNTY_DURATION_MS = 24 * 3_600_000;
/** Auto-refresh bounties when the board is older than this. */
const WANTED_AUTO_REFRESH_MS = 20 * 60_000;
/** Bounty reward multiplier over the (buy) value of the wanted cars. */
/** Bounty reward = this × the wanted cars' base value. Must stay BELOW
 *  1.0: buying a car costs exactly its base value, so a reward ≥ value
 *  turns claim→rebuy into an infinite money printer (+4× per cycle at 5×).
 *  0.9× still pays ~2.6× more than plain selling (35%) — a real bonus for
 *  cars you already own, while rebuy-farming loses 10% per cycle. */
const BOUNTY_REWARD_MULT = 0.9;
/** Manual bounty-board refresh cost ≈ a slice of the player's cash. */
const WANTED_REFRESH_CASH_PCT = 0.05;
/** …but never less than this floor, scaled by level. */
const WANTED_REFRESH_FLOOR_PER_LEVEL = 250;

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
    ownedCars: { [STARTER_ID]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
    inventory: {},
    cratesOpened: 0,
    totalClicks: 0,
    totalEarned: 0,
    achievements: [],
    dealerRefreshAt: now,
    dealerStock,
    daily: { nextClaimAt: 0, lastClaimAt: 0, streak: 0 },
    clicksOnStarter: 0,
    earnCarry: 0,
    lastTick: now,
    lastSpinAt: 0,
    freeSpins: 0,
    weekly: initialWeeklyState(now),
    wantedBounties: [],
    wantedRefreshAt: 0,
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
  // Car stops earning when fuel is empty
  const fuel = state.ownedCars[state.activeCarId]?.fuel;
  if (fuel !== undefined && fuel <= 0) return 0;
  // THE NEW-ACCOUNT CONTRACT: the starter hatchback always pays exactly $1
  // per click, regardless of condition, upgrades or prestige. The engine
  // deliberately ignores its list value here so upgrades can't inflate the
  // anchor and the displayed click value can never drift off $1.
  if (state.activeCarId === STARTER_ID) return STARTER_CLICK_VALUE;
  const cond = conditionOf(state, state.activeCarId);
  const condMult = 0.5 + 0.5 * cond;
  const mults = carUpgradeMults(state, state.activeCarId);
  // A click pays ~40 seconds of that car's passive income — active play is
  // meaningfully faster than idling, and better cars click for more.
  const base = def.value * 0.0008;
  return Math.max(1, Math.round(base * (1 + mults.clickMult) * condMult * clickMultiplier(state)));
}

/** Per-second income for ONE owned car (before the global passive multiplier). */
export function carIncomePerSec(state: GameState, carId: string): number {
  const def = GAME_CAR_MAP[carId];
  if (!def || def.secret) return 0; // secret cars never generate income
  // THE NEW-ACCOUNT CONTRACT: the starter is click-only — it never drips
  // passive cash, so a fresh account sits at exactly $0/s until the first
  // real car is bought.
  if (carId === STARTER_ID) return 0;
  const fuel = state.ownedCars[carId]?.fuel;
  if (fuel !== undefined && fuel <= 0) return 0; // empty tank earns nothing
  const cond = conditionOf(state, carId);
  const condMult = 0.5 + 0.5 * cond;
  const mults = carUpgradeMults(state, carId);
  return def.value * CAR_PASSIVE_RATE * (1 + mults.passiveMult) * condMult;
}

export function passivePerSec(state: GameState): number {
  let base = 0;
  for (const carId of Object.keys(state.ownedCars)) {
    base += carIncomePerSec(state, carId);
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

/**
 * Cash consolation for a "cash" crate roll: 1–2× the crate's base cost.
 * At CRATE_COST_MULT=3 that refunds 33–67% of what you paid — never profit
 * on its own, but never pocket change either.
 */
export function crateCashRefund(crateId: string): number {
  const crate = CRATE_MAP[crateId];
  if (!crate) return 0;
  return Math.round(crate.cost * (1 + Math.random()));
}

/** Payout when you receive a car you already own (crate or spin). Must stay
 *  well below 100% of value: otherwise opening cheap crates until you hit a
 *  mega-value duplicate is a money printer (old 20% paid $600M for a vault
 *  crate that costs $75M). Capped so the refund never dwarfs the crate cost. */
export function dupCarRefund(carValue: number): number {
  return Math.min(2_500_000, Math.round(carValue * 0.05));
}

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

  // Cash consolation refunds 1–2× the crate's base cost (33–67% of what you
  // paid at ×3) — a "cash" roll is a partial refund, never pocket change.
  const cash = crateCashRefund(crateId);
  return { kind: "cash", cash };
}

// ── Lucky Spin wheel ──────────────────────────────────────────────────────────

/** Cash values on the wheel, growing with player level (slice 0 is the car).
 *  At level 1 the average slice ≈ 30 min of starter-garage income — the free
 *  15-min spin is a snack on top of car income, never the main course. */
const SPIN_CASH_BASE = [60, 150, 300, 600, 1100, 1800, 3000, 5000, 8000];

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

/** Tier 3: Ultra-rare $1B+ car (0.001% chance) — label-matched: every car
 *  in this pool is worth at least $1B, so the wheel's "$1B+" badge never
 *  over-promises. */
export function spinSupercarPool001() {
  return Object.values(GAME_CAR_MAP).filter(
    (c) => !c.secret && c.value >= 1_000_000_000,
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
  // Anchored to the garage you actually OWN: 15 minutes of real passive
  // income (was questUnit = level², which minted $55K dailies for level-
  // rushed accounts with one cheap car). $500 floor keeps day-one accounts
  // playing; streak bonus is a gentle +5%/day capped at +65%.
  const base = Math.max(500, passivePerSec(state) * 900);
  const streakMult = 1 + 0.05 * (Math.min(streak, 14) - 1);
  return Math.round(base * streakMult * (1 + state.prestigeLevel * 0.1));
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
  | { type: "CLAIM_OFFLINE"; amount: number; now: number }
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
  | { type: "WEEKLY_CHECK"; now: number }
  | { type: "CLAIM_WEEKLY"; challengeId: string }
  | { type: "BUY_FUEL"; carId: string }
  | { type: "SELL_FOR_BOUNTY"; bountyId: string }
  | { type: "REFRESH_WANTED"; now: number; cost: number }
  | { type: "LOAD"; state: GameState };

/** Ensure the weekly state matches the current week AND a playable level. */
function ensureWeekly(s: GameState, now: number): WeeklyState {
  const currentMonday = getMonday(new Date(now));
  const level = levelFrom(s);
  if (s.weekly.weekStart === currentMonday) {
    // Same week: the board stays FROZEN at the level it was generated for.
    // Re-scaling targets mid-week made the "Earn $X this week" quest
    // mathematically uncompletable — the target (40K·lvl²) grows ~8× faster
    // than the level band (5K·(lvl−1)²), so every level-up moved the finish
    // line further ahead than the earning that triggered it. A leveled-UP
    // player keeps the week's original board and rewards; next week
    // re-scales. Old saves without genLevel are treated as current (frozen).
    const genLevel = s.weekly.genLevel ?? level;
    if (level >= genLevel) return s.weekly;
    // Level-DOWN mid-week (prestige / admin reset): regenerate a fresh board
    // for the new level — carrying progress into smaller targets would make
    // some challenges instantly claimable for free.
    return {
      ...s.weekly,
      genLevel: level,
      weeklyEarned: 0,
      weeklyClicks: 0,
      weeklyCarsBought: 0,
      weeklyCratesOpened: 0,
      weeklySpins: 0,
      weeklyPrestiges: 0,
      challenges: generateWeeklyChallenges(currentMonday, level),
    };
  }
  // New week: fresh counters and a freshly scaled set of challenges.
  return {
    weekStart: currentMonday,
    genLevel: level,
    weeklyEarned: 0,
    weeklyClicks: 0,
    weeklyCarsBought: 0,
    weeklyCratesOpened: 0,
    weeklySpins: 0,
    weeklyPrestiges: 0,
    challenges: generateWeeklyChallenges(currentMonday, level),
  };
}

/**
 * Cars that can appear as bounty targets. Excludes secret cars AND casino
 * one-offs (dealer "vault") — they're wheel-only prizes at every level, so a
 * bounty asking for a $3B casino special would be an uncompletable slot.
 */
function bountyPool(): GameCarDef[] {
  return Object.values(GAME_CAR_MAP).filter((c) => !c.secret && c.dealer !== "vault");
}

/**
 * Cost to manually refresh the bounty board: the greater of a 5% cash slice
 * and a level-scaled floor — cheap early, meaningful for rich players.
 */
export function wantedRefreshCost(state: GameState): number {
  const level = levelFrom(state);
  // Mega-level saves (level in the billions) must still be able to afford a
  // reroll — the floor's level input is capped at the quest level cap.
  const floor = WANTED_REFRESH_FLOOR_PER_LEVEL * Math.max(1, Math.min(level, 500) - 1);
  return Math.max(floor, Math.round(state.cash * WANTED_REFRESH_CASH_PCT));
}

/** Generate a set of wanted bounties appropriate for the player's level. */
export function generateBounties(now: number, level = 1): WantedBounty[] {
  const allCars = bountyPool();
  // Mega-level saves (level in the billions) pick from the same top-shelf
  // pool as level 500 — car unlock levels stop long before that.
  const lvl = Math.min(level, 500);
  const bounties: WantedBounty[] = [];
  for (let i = 0; i < WANTED_BOUNTY_COUNT; i++) {
    // Each bounty wants 1–3 distinct cars the player can actually own.
    const wantCount = 1 + Math.floor(Math.random() * 3);
    // Cars near the player's level pay the best rewards and stay buyable.
    // (Far-below-level cars paid pocket change — the "rewards too low" bug;
    // anything above level+2 could be unbuyable at that level.)
    const inWindow = allCars.filter((c) => Math.abs(c.unlockLevel - lvl) <= 2);
    const atOrBelow = allCars.filter((c) => c.unlockLevel <= lvl);
    const candidates =
      inWindow.length >= wantCount ? inWindow : atOrBelow.length >= wantCount ? atOrBelow : allCars;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const wants: { carId: string; count: number }[] = [];
    const usedIds = new Set<string>();
    let totalValue = 0;
    for (const car of shuffled) {
      if (wants.length >= wantCount) break;
      if (usedIds.has(car.id)) continue;
      usedIds.add(car.id);
      // Players can own one of each car — every requirement must be 1.
      wants.push({ carId: car.id, count: 1 });
      totalValue += car.value;
    }
    if (wants.length === 0) continue;
    bounties.push({
      id: `bounty-${now}-${i}`,
      wants,
      reward: Math.round(totalValue * BOUNTY_REWARD_MULT),
      expiresAt: now + BOUNTY_DURATION_MS,
      claimed: false,
    });
  }
  return bounties;
}

/** Check if a player can complete a bounty (owns every wanted car). */
export function canCompleteBounty(state: GameState, bounty: WantedBounty): boolean {
  return bounty.wants.every(({ carId, count }) => {
    if (count <= 1) return Boolean(state.ownedCars[carId]);
    // Counts > 1 aren't generatable today (one copy per car), but keep the
    // old saves safe: treat the requirement as satisfiable if owned.
    return Boolean(state.ownedCars[carId]);
  });
}

/**
 * Fuel cost to fully refuel a car, scaled by player level.
 *
 * Anchored to questUnit(level) = max(250, 3400 × lvl²) — the economy's level
 * yardstick — so fuel stays the same *fraction* of earning power at every
 * stage: a full tank costs 6% of a quest unit (0.06 × max(250, 3400·lvl²),
 * floored at FUEL_COST), i.e. the $200 floor at level 1, ~$1.8K at level 3,
 * ~$138K at level 26. Prosperity alone can't make refueling free, but the
 * tax never outpaces income either.
 */
export function fuelCost(state: GameState, carId: string): number {
  const owned = state.ownedCars[carId];
  if (!owned) return 0;
  const missing = FUEL_MAX - (owned.fuel ?? FUEL_MAX);
  const unitPrice = Math.max(FUEL_COST, Math.round(questUnit(levelFrom(state)) * 0.06));
  return missing > 0 ? Math.max(1, Math.round(unitPrice * (missing / FUEL_MAX))) : 0;
}

/** Track a weekly metric and update challenge progress. */
function trackWeekly(s: GameState, metric: string, amount: number): WeeklyState {
  const weekly = { ...s.weekly };
  // Update metric counters
  if (metric === "earned") weekly.weeklyEarned += amount;
  else if (metric === "clicks") weekly.weeklyClicks += amount;
  else if (metric === "carsBought") weekly.weeklyCarsBought += amount;
  else if (metric === "cratesOpened") weekly.weeklyCratesOpened += amount;
  else if (metric === "spins") weekly.weeklySpins += amount;
  else if (metric === "prestiges") weekly.weeklyPrestiges += amount;

  // Update challenge progress
  weekly.challenges = weekly.challenges.map((ch) => {
    if (ch.claimed) return ch;
    const m = challengeMetric(ch);
    if (m === metric) {
      return { ...ch, progress: Math.min(ch.target, ch.progress + amount) };
    }
    return ch;
  });

  return weekly;
}

/**
 * Expire stale bounties and top the board up ONLY when a slot is actually
 * missing — a full board is left untouched so the 24h expiry stays honest.
 */
function maintainBounties(s: GameState, now: number): GameState {
  // Corrupt/legacy rows with empty wants passed canCompleteBounty (empty
  // .every() is true) and paid the full reward for ZERO cars — the literal
  // "you get the reward but keep the cars" bug. Drop them on upkeep.
  const valid = (b: WantedBounty) => Array.isArray(b.wants) && b.wants.length > 0;
  const live = s.wantedBounties.filter((b) => !b.claimed && b.expiresAt > now && valid(b));
  const settled = s.wantedBounties.filter((b) => b.claimed && valid(b));
  if (live.length >= WANTED_BOUNTY_COUNT) {
    if (live.length + settled.length === s.wantedBounties.length) return s;
    return { ...s, wantedBounties: [...live, ...settled] };
  }
  const refill = generateBounties(now, levelFrom(s));
  return {
    ...s,
    wantedBounties: [...live, ...refill].slice(0, WANTED_BOUNTY_COUNT),
    wantedRefreshAt: now,
  };
}

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

export function gameReducer(prevState: GameState, action: Action): GameState {
  // Cheap weekly/bounty upkeep on every action — keeps boards live without
  // dedicated timers. Upkeep runs on the ACTION'S clock when it carries one
  // (TICK, WEEKLY_CHECK, SPIN…): using Date.now() internally made WEEKLY_CHECK
  // with an explicit timestamp process two different weeks in one dispatch
  // (pre-switch upkeep vs the case body), so its output depended on wall-clock
  // skew and convergence tests could observe a mid-dispatch regeneration.
  const now =
    "now" in action && typeof action.now === "number" ? action.now : Date.now();
  const weekly = ensureWeekly(prevState, now);
  const upkeep = maintainBounties(
    weekly === prevState.weekly ? prevState : { ...prevState, weekly },
    now,
  );
  const state = upkeep;
  switch (action.type) {
    case "CLICK": {
      // A $0 click is legitimate — a car with empty fuel earns nothing and
      // the UI shows $0. Only junk input gets the $1 floor; clamping a real
      // 0 up to 1 paid cash the UI promised was $0.
      const amount = action.amount > 0 ? Math.max(1, Math.round(action.amount)) : 0;
      const wasStarter = state.activeCarId === STARTER_ID;
      const nextClicks = state.clicksOnStarter + (wasStarter ? 1 : 0);
      const weeklyEarned = trackWeekly(state, "earned", amount);
      const weeklyClicks = trackWeekly({ ...state, weekly: weeklyEarned }, "clicks", 1);

      // Secret-car reveal: 300 clicks on the starter uncover the ghost
      // prototype. >= so pre-fix saves that already banked 300+ clicks get
      // it on their next starter click. applyAchievements below then pays
      // the "secret-found" reward in the same pass.
      const grantGhost =
        wasStarter &&
        nextClicks >= SECRET_CAR_CLICKS &&
        !state.ownedCars[SECRET_CAR_ID] &&
        Boolean(GAME_CAR_MAP[SECRET_CAR_ID]);

      // Fuel depletion: every FUEL_DRAIN_INTERVAL clicks on a car, fuel drops 1.
      // The starter is exempt — it's the eternal $1/click fallback, and letting
      // it run dry soft-locked fresh accounts (0 fuel + <$200 cash = no income
      // source left at all). It runs on hope, not gasoline.
      const activeOwned = state.ownedCars[state.activeCarId];
      let ownedCars = state.ownedCars;
      if (activeOwned && !wasStarter) {
        const prevClicks = activeOwned.clicksSinceFuel ?? 0;
        const newClicks = prevClicks + 1;
        const fuel = activeOwned.fuel ?? FUEL_MAX;
        if (newClicks >= FUEL_DRAIN_INTERVAL) {
          // Roll the counter whether or not fuel remains — letting it grow
          // unbounded while empty meant the first click after a refuel
          // instantly burned 1 fuel the player just paid for.
          const newFuel = fuel > 0 ? fuel - 1 : fuel;
          ownedCars = {
            ...ownedCars,
            [state.activeCarId]: { ...activeOwned, fuel: newFuel, clicksSinceFuel: 0 },
          };
        } else {
          ownedCars = {
            ...ownedCars,
            [state.activeCarId]: { ...activeOwned, clicksSinceFuel: newClicks },
          };
        }
      }

      const next = {
        ...state,
        cash: state.cash + amount,
        totalEarned: state.totalEarned + amount,
        totalClicks: state.totalClicks + 1,
        clicksOnStarter: nextClicks,
        lastTick: Date.now(),
        weekly: weeklyClicks,
        ownedCars: grantGhost
          ? { ...ownedCars, [SECRET_CAR_ID]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } }
          : ownedCars,
      };
      return applyAchievements(next);
    }
    case "CLAIM_OFFLINE": {
      // Offline earnings, credited once on mount BEFORE the first TICK —
      // otherwise TICK's own dt would re-credit the whole away-gap at 100%.
      const amount = Math.max(0, Math.round(action.amount));
      if (amount <= 0) return { ...state, lastTick: action.now };
      const weekly = trackWeekly(state, "earned", amount);
      return applyAchievements({
        ...state,
        cash: state.cash + amount,
        totalEarned: state.totalEarned + amount,
        lastTick: action.now,
        weekly,
      });
    }
    case "TICK": {
      const dt = Math.min(28_800, Math.max(0, (action.now - state.lastTick) / 1000));
      const mult = action.globalMultiplier ?? 1;
      // Fractional carry: early cars earn < $1/s, so flooring each 1s tick
      // minted $0 forever. Accumulate the remainder in state instead.
      const raw = passivePerSec(state) * dt * mult + (state.earnCarry ?? 0);
      const gain = Math.floor(raw);
      const carry = raw - gain;
      if (gain <= 0) return { ...state, lastTick: action.now, earnCarry: carry };
      const weekly = trackWeekly(state, "earned", gain);
      return applyAchievements({
        ...state,
        cash: state.cash + gain,
        totalEarned: state.totalEarned + gain,
        earnCarry: carry,
        lastTick: action.now,
        weekly,
      });
    }
    case "BUY_CAR": {
      const def = GAME_CAR_MAP[action.id];
      if (!def) return state;
      if (state.ownedCars[action.id]) return state;
      if (levelFrom(state) < def.unlockLevel) return state;
      const price = buyPrice(action.id);
      if (state.cash < price) return state;
      const weekly = trackWeekly(state, "carsBought", 1);
      return applyAchievements({
        ...state,
        cash: state.cash - price,
        ownedCars: { ...state.ownedCars, [action.id]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
        weekly,
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
      // Resale value: cars depreciate hard — a third of current value.
      const gain = Math.round(carValue(state, action.id) * 0.3);
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
          cash += dupCarRefund(def.value);
        } else if (def) {
          ownedCars = { ...ownedCars, [r.carId]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } };
        }
      } else if (r.kind === "part" && r.partId) {
        inventory = { ...inventory, [r.partId]: (inventory[r.partId] ?? 0) + 1 };
      } else if (r.kind === "cash") {
        cash += r.cash ?? 0;
      }
      const weekly = trackWeekly(state, "cratesOpened", 1);
      return applyAchievements({
        ...state,
        cash,
        ownedCars,
        inventory,
        cratesOpened: state.cratesOpened + 1,
        weekly,
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
      // Clamp the reward: a negative/NaN amount must never drain cash.
      const reward = Number.isFinite(action.reward) ? Math.max(0, Math.floor(action.reward)) : 0;
      const streak =
        state.daily.lastClaimAt > 0 && now - state.daily.lastClaimAt <= 86_400_000
          ? state.daily.streak + 1
          : 1;
      return {
        ...state,
        cash: state.cash + reward,
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
      const weeklySpin = trackWeekly(state, "spins", 1);
      const r = action.result;
      if (r.kind === "car" && r.carId) {
        const def = GAME_CAR_MAP[r.carId];
        if (!def) return { ...state, lastSpinAt: action.now, freeSpins: nextFreeSpins, weekly: weeklySpin };
        if (state.ownedCars[r.carId]) {
          return applyAchievements({
            ...state,
            cash: state.cash + dupCarRefund(def.value),
            lastSpinAt: action.now,
            freeSpins: nextFreeSpins,
            weekly: weeklySpin,
          });
        }
        return applyAchievements({
          ...state,
          ownedCars: { ...state.ownedCars, [r.carId]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
          lastSpinAt: action.now,
          freeSpins: nextFreeSpins,
          weekly: weeklySpin,
        });
      }
      return applyAchievements({
        ...state,
        cash: state.cash + (r.amount ?? 0),
        lastSpinAt: action.now,
        freeSpins: nextFreeSpins,
        weekly: weeklySpin,
      });
    }
    case "REFRESH_DEALER": {
      // The UI computes the cost and sends it — but cash changes every tick
      // (passive income), so a stale/staged click could dip below the price
      // between render and dispatch. Re-validate here: never go negative.
      if (state.cash < action.cost) return state;
      return {
        ...state,
        cash: state.cash - action.cost,
        dealerStock: { ...state.dealerStock, [action.dealerId]: action.stock },
        dealerRefreshAt: action.refreshAt,
      };
    }
    case "PRESTIGE": {
      // Prestige costs scale so each loop demands a bigger grind.
      const requirement = 8000 * (state.prestigeLevel + 1);
      if (state.reputation < requirement) return state;
      const weeklyP = trackWeekly(state, "prestiges", 1);
      return normalize(state, {
        ...initialGameState(),
        prestigeLevel: state.prestigeLevel + 1,
        achievements: [],
        totalEarned: 0,
        lastTick: Date.now(),
        weekly: weeklyP,
      });
    }
    case "GIVE_SPINS":
      return { ...state, freeSpins: state.freeSpins + Math.max(0, Math.round(action.amount)) };

    case "WEEKLY_CHECK": {
      const weekly = ensureWeekly(state, action.now);
      return { ...state, weekly };
    }
    case "CLAIM_WEEKLY": {
      const challenge = state.weekly.challenges.find((c) => c.id === action.challengeId);
      if (!challenge || challenge.claimed || challenge.progress < challenge.target) return state;
      const updated = {
        ...state,
        cash: state.cash + challenge.rewardCash,
        reputation: state.reputation + challenge.rewardRep,
        weekly: {
          ...state.weekly,
          challenges: state.weekly.challenges.map((c) =>
            c.id === action.challengeId ? { ...c, claimed: true } : c,
          ),
        },
      };
      return applyAchievements(updated);
    }

    case "HARD_RESET":
      return initialGameState();
    case "RESET_PROGRESS": {
      const opts = action.resetOptions;
      const fresh = initialGameState();
      // When upgrading, strip all upgrades from owned cars (keep the cars themselves).
      let ownedCars = state.ownedCars;
      if (opts.upgrades) {
        const stripped: Record<string, { upgrades: Record<string, number>; fuel: number; clicksSinceFuel: number }> = {};
        for (const [id, owned] of Object.entries(ownedCars)) {
          stripped[id] = { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 };
        }
        ownedCars = stripped;
      }
      return {
        ...state,
        cash: opts.cash ? 0 : state.cash,
        ownedCars: opts.cars
          ? { [state.activeCarId]: state.ownedCars[state.activeCarId] ?? { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } }
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
        ownedCars: { ...state.ownedCars, [action.carId]: { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 } },
      });
    }
    case "BUY_FUEL": {
      const owned = state.ownedCars[action.carId];
      if (!owned) return state;
      const currentFuel = owned.fuel ?? FUEL_MAX;
      if (currentFuel >= FUEL_MAX) return state;
      const cost = fuelCost(state, action.carId);
      if (cost <= 0 || state.cash < cost) return state;
      return {
        ...state,
        cash: state.cash - cost,
        ownedCars: {
          ...state.ownedCars,
          [action.carId]: { ...owned, fuel: FUEL_MAX, clicksSinceFuel: 0 },
        },
      };
    }
    case "SELL_FOR_BOUNTY": {
      const bounty = state.wantedBounties.find((b) => b.id === action.bountyId);
      if (!bounty || bounty.claimed) return state;
      // Defense in depth: an empty-wants bounty (corrupt save) must never
      // pay — it has no cars to take, so a payout would be free money.
      // maintainBounties drops these on the next upkeep anyway.
      if (!bounty.wants || bounty.wants.length === 0) return state;
      if (bounty.expiresAt <= Date.now()) return state;
      if (!canCompleteBounty(state, bounty)) return state;
      // Remove owned cars that were part of the bounty
      const ownedCars = { ...state.ownedCars };
      for (const { carId } of bounty.wants) {
        delete ownedCars[carId];
      }
      // A claim may legitimately sell the player's ENTIRE garage (the board
      // only ever asks for owned cars). Refusing the claim — the old
      // "can't claim" bug — was worse than topping the garage back up with
      // the starter, so hand one back and pay out.
      if (Object.keys(ownedCars).length === 0) {
        // Guard the new-account contract: the reseeded starter is click-only
        // and $1/click, so a claim can never mint passive income. (A $600
        // value reseed that quietly paid ~$0.3/s would be a small printer:
        // claim → sell starter → claim → …) Only reseed when the player has
        // NO OTHER CAR to fall back on, which by construction here is true.
        ownedCars[STARTER_ID] = { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 };
      }
      const activeCarId =
        state.activeCarId in ownedCars ? state.activeCarId : (Object.keys(ownedCars)[0] ?? STARTER_ID);
      // Refill the freed board slot immediately instead of waiting for the
      // player's next unrelated click.
      return maintainBounties(
        applyAchievements({
          ...state,
          cash: state.cash + bounty.reward,
          totalEarned: state.totalEarned + bounty.reward,
          ownedCars,
          activeCarId,
          wantedBounties: state.wantedBounties.map((b) =>
            b.id === action.bountyId ? { ...b, claimed: true } : b,
          ),
        }),
        Date.now(),
      );
    }
    case "REFRESH_WANTED": {
      // The COST IS COMPUTED HERE, from live state — the panel's copy goes
      // stale constantly (passive income changes cash every tick), and the
      // old exact-match check silently rejected most paid rerolls.
      if (action.cost === 0) {
        // Free refresh = auto-seed: top up an incomplete board, never wipe
        // live or claimed bounties, never touch a full board.
        return maintainBounties(state, action.now);
      }
      const cost = wantedRefreshCost(state);
      if (state.cash < cost) return state;
      return {
        ...state,
        cash: state.cash - cost,
        // A paid reroll swaps in a fresh LIVE board (claimed entries are
        // invisible history — maintainBounties drops them too).
        wantedBounties: generateBounties(action.now, levelFrom(state)),
        wantedRefreshAt: action.now,
      };
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
    weekly: loaded.weekly ?? current.weekly ?? initialWeeklyState(Date.now()),
    wantedBounties: loaded.wantedBounties ?? current.wantedBounties ?? [],
    wantedRefreshAt: loaded.wantedRefreshAt ?? current.wantedRefreshAt ?? 0,
  };
  // ECONOMY MIGRATION (v1 → v2): pre-rebalance saves carry weekly quests with
  // wildly overstated lvl² rewards ("$498K for 389 clicks" at level 3) and a
  // 15-minute spin cooldown that no longer matches the new payout scale.
  // Regenerate the board at the player's real level and clear the spin timer
  // so the rebalanced wheel is immediately playable. Cash/cars are kept.
  if ((base.version ?? 1) < 2) {
    base.weekly = initialWeeklyState(Date.now(), levelFrom(base));
    base.lastSpinAt = 0;
    base.version = STORAGE_VERSION;
  }
  // Legacy/corrupt weekly state without a challenges array would crash every
  // trackWeekly pass — regenerate the board defensively.
  if (!Array.isArray(base.weekly?.challenges)) {
    base.weekly = initialWeeklyState(Date.now(), levelFrom(base));
  }
  // Ensure all owned cars have fuel fields (for old saves). `upgrades` must
  // default too: a legacy/corrupt row without it crashed conditionOf and
  // carUpgradeMults with a TypeError on every read.
  const ownedCars: Record<string, { upgrades: Record<string, number>; fuel: number; clicksSinceFuel: number }> = {};
  for (const [id, owned] of Object.entries(base.ownedCars)) {
    if (!owned) continue; // drop null/undefined rows outright
    ownedCars[id] = {
      upgrades: owned.upgrades ?? {},
      fuel: owned.fuel ?? FUEL_MAX,
      clicksSinceFuel: owned.clicksSinceFuel ?? 0,
    };
  }
  base.ownedCars = ownedCars;
  // A corrupt save can point activeCarId at a car the player doesn't own —
  // clicking it would pay value-based cash for a car that isn't in the
  // garage. An empty garage reseeds the click-only starter so the account
  // always has its $1/click fallback.
  if (!base.ownedCars[base.activeCarId]) {
    if (Object.keys(base.ownedCars).length === 0) {
      base.ownedCars[STARTER_ID] = { upgrades: {}, fuel: FUEL_MAX, clicksSinceFuel: 0 };
    }
    base.activeCarId = Object.keys(base.ownedCars)[0];
  }
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


