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

export interface RaceDef {
  id: string;
  name: string;
  unlockLevel: number;
  /** Power needed for ~50% win; player power = hp * (1 + hpMult). */
  reqPower: number;
  rewardCash: number;
  rewardRep: number;
  partChance: number;
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
  racesWon: number;
  totalClicks: number;
  totalEarned: number;
  achievements: string[];
  dealerRefreshAt: number;
  dealerStock: Record<string, string[]>;
  daily: { day: string; streak: number };
  clicksOnStarter: number;
  lastTick: number;
}

export interface CrateResult {
  kind: "car" | "part" | "cash";
  carId?: string;
  partId?: string;
  cash?: number;
}

export interface RaceResult {
  won: boolean;
  cash: number;
  rep: number;
  partId?: string;
}
