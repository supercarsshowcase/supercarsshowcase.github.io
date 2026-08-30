/** Shared types for the Supercars Showcase game. */

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "exotic"
  | "hyper"
  | "mythic"
  | "ultimate";

export interface RarityMeta {
  label: string;
  color: string;
  glow: string;
}

export interface GameCarDef {
  id: string;
  brand: string;
  name: string;
  year: number;
  /** Wikimedia slug of a matching gallery car, or "" to use the generated scene. */
  gallerySlug: string;
  hp: number;
  topSpeed: number;
  accel: number;
  value: number;
  rarity: Rarity;
  unlockLevel: number;
  dealer: string;
  /** 0 = never drops from crates. */
  crateTier: number;
  secret?: boolean;
}

export type StatKey = "clickMult" | "passiveMult" | "valueMult" | "hpMult";

export interface UpgradeStage {
  cost: number;
  effect: Partial<Record<StatKey, number>>;
}

export interface UpgradeDef {
  id: string;
  category: "restore" | "performance" | "handling" | "cosmetic";
  name: string;
  icon: string;
  desc: string;
  /** Base cost scaled by the car's value tier. */
  baseCost: number;
  costScale: number;
  stages: UpgradeStage[];
}

export interface PartDef {
  id: string;
  name: string;
  rarity: Rarity;
  value: number;
  desc: string;
  /** Global additive bonus per copy held in inventory. */
  clickMult?: number;
  passiveMult?: number;
  /** Restricts which car brands the part fits; empty = universal. */
  brands?: string[];
}

export interface CrateDef {
  id: string;
  name: string;
  icon: string;
  cost: number;
  color: string;
  desc: string;
  /** Relative weights per rarity for the car/part drop. */
  weights: Partial<Record<Rarity, number>>;
  /** Highest crate tier of cars that can drop. */
  maxTier: number;
  cashMin: number;
  cashMax: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  rewardCash?: number;
  rewardRep?: number;
  check: (s: GameState) => boolean;
}

export interface DealerDef {
  id: string;
  name: string;
  tagline: string;
  unlockLevel: number;
  refreshCost: number;
  pool: string[];
  slots: number;
}

export interface OwnedCar {
  upgrades: Record<string, number>;
}

export interface GameState {
  version: number;
  cash: number;
  reputation: number;
  prestigeLevel: number;
  activeCarId: string;
  ownedCars: Record<string, OwnedCar>;
  inventory: Record<string, number>;
  cratesOpened: number;
  totalClicks: number;
  totalEarned: number;
  achievements: string[];
  dealerRefreshAt: number;
  dealerStock: Record<string, string[]>;
  daily: { nextClaimAt: number; lastClaimAt: number; streak: number };
  clicksOnStarter: number;
  lastTick: number;
  /** Timestamp of the last Lucky Spin; the wheel is free every 15 minutes. */
  lastSpinAt: number;
  /** Bonus spins granted by admin that skip the cooldown. */
  freeSpins: number;
  /** Weekly challenges reset every Monday. */
  weekly: WeeklyState;
}

export interface SpinResult {
  kind: "cash" | "car";
  amount?: number;
  carId?: string;
  /** Winning slice index on the 12-slice wheel (0 = supercar). */
  slice: number;
  /** Which car tier was won: 1 = 1% ($10-30M), 2 = 0.01% ($100-300M), 3 = 0.001% ($1B+) */
  tier?: 1 | 2 | 3;
}

export interface WeeklyChallenge {
  id: string;
  name: string;
  desc: string;
  target: number;
  progress: number;
  rewardCash: number;
  rewardRep: number;
  claimed: boolean;
}

export interface WeeklyState {
  /** ISO date string (YYYY-MM-DD) for the start of the current week (Monday). */
  weekStart: string;
  /** Total cash earned during this week. */
  weeklyEarned: number;
  /** Clicks made during this week. */
  weeklyClicks: number;
  /** Cars purchased during this week. */
  weeklyCarsBought: number;
  /** Crates opened during this week. */
  weeklyCratesOpened: number;
  /** Wheel spins during this week. */
  weeklySpins: number;
  /** Prestiges during this week. */
  weeklyPrestiges: number;
  /** Challenges with their current progress. */
  challenges: WeeklyChallenge[];
}

export interface CrateResult {
  kind: "car" | "part" | "cash";
  carId?: string;
  partId?: string;
  cash?: number;
}
