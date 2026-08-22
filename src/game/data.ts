import { carsList } from "@/data/cars";
import { getCarImage } from "@/data/images";
import type { Car } from "@/lib/types";
import type {
  AchievementDef,
  CrateDef,
  DealerDef,
  GameCarDef,
  PartDef,
  Rarity,
  RarityMeta,
  StatKey,
  UpgradeDef,
} from "./types";

// ── Rarity metadata ───────────────────────────────────────────────────────────

export const RARITIES: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "exotic",
  "hyper",
  "mythic",
  "ultimate",
];

export const RARITY_META: Record<Rarity, RarityMeta> = {
  common: { label: "Common", color: "#9ca3af", glow: "rgba(156,163,175,0.5)" },
  uncommon: { label: "Uncommon", color: "#4ade80", glow: "rgba(74,222,128,0.5)" },
  rare: { label: "Rare", color: "#38bdf8", glow: "rgba(56,189,248,0.5)" },
  epic: { label: "Epic", color: "#a78bfa", glow: "rgba(167,139,250,0.5)" },
  legendary: { label: "Legendary", color: "#f59e0b", glow: "rgba(245,158,11,0.5)" },
  exotic: { label: "Exotic", color: "#fb7185", glow: "rgba(251,113,133,0.5)" },
  hyper: { label: "Hyper", color: "#22d3ee", glow: "rgba(34,211,238,0.5)" },
  mythic: { label: "Mythic", color: "#c084fc", glow: "rgba(192,132,252,0.55)" },
  ultimate: { label: "Ultimate", color: "#ffd700", glow: "rgba(255,215,0,0.6)" },
};

export const STARTER_ID = "rusty-hatch-91";
export const SECRET_CAR_ID = "ghost-prototype";

// ── Car definitions ───────────────────────────────────────────────────────────

type CarSpec = [
  id: string,
  brand: string,
  name: string,
  year: number,
  gallerySlug: string,
  hp: number,
  topSpeed: number,
  accel: number,
  value: number,
  rarity: Rarity,
  unlockLevel: number,
  dealer: string,
  crateTier: number,
];

function car(s: CarSpec): GameCarDef {
  return {
    id: s[0],
    brand: s[1],
    name: s[2],
    year: s[3],
    gallerySlug: s[4],
    hp: s[5],
    topSpeed: s[6],
    accel: s[7],
    value: s[8],
    rarity: s[9],
    unlockLevel: s[10],
    dealer: s[11],
    crateTier: s[12],
  };
}

const rawCars: CarSpec[] = [
  // ── Level 1–8 · beaters & daily drivers ──
  ["rusty-hatch-91", "Rust City", "Rust Bucket Hatchback", 1991, "", 62, 132, 16.2, 500, "common", 1, "used", 0],
  ["beater-sedan-87", "Rust City", "Scrapyard Sedan", 1987, "", 85, 155, 13.5, 850, "common", 1, "used", 0],
  ["farm-pickup-80", "Rust City", "Farm Pickup", 1980, "", 105, 148, 14.1, 1250, "common", 1, "used", 0],
  ["civic-lx-95", "Honda", "Civic LX", 1995, "", 106, 180, 10.8, 2600, "common", 2, "used", 1],
  ["corolla-se-97", "Toyota", "Corolla SE", 1997, "", 105, 178, 10.9, 4000, "common", 2, "used", 1],
  ["golf-mk3-94", "Volkswagen", "Golf Mk3", 1994, "", 115, 185, 10.2, 6200, "uncommon", 3, "used", 1],
  ["mx5-nb-00", "Mazda", "MX-5 NB", 2000, "", 140, 196, 8.1, 12000, "uncommon", 5, "used", 2],
  ["gti-mk2-90", "Volkswagen", "Golf GTI Mk2", 1990, "", 112, 180, 9.8, 9500, "uncommon", 4, "used", 2],
  ["civic-si-99", "Honda", "Civic Si", 1999, "", 160, 208, 7.9, 14000, "uncommon", 5, "used", 2],
  ["supra-mk3-88", "Toyota", "Supra Mk3", 1988, "", 200, 224, 7.1, 24000, "rare", 7, "budget", 2],
  ["skyline-gts-92", "Nissan", "Skyline GTS", 1992, "", 190, 216, 7.5, 28000, "rare", 8, "budget", 2],
  ["brz-13", "Subaru", "BRZ", 2013, "", 200, 226, 6.9, 32000, "rare", 9, "budget", 2],
  // ── Level 8–20 · modified street cars ──
  ["golf-r-16", "Volkswagen", "Golf R", 2016, "", 310, 250, 4.7, 47000, "rare", 11, "budget", 3],
  ["type-r-17", "Honda", "Civic Type R", 2017, "", 306, 272, 5.0, 52000, "rare", 12, "budget", 3],
  ["supra-mk4-97", "Toyota", "Supra Mk4", 1997, "", 320, 250, 4.9, 95000, "rare", 14, "budget", 3],
  ["rs3-19", "Audi", "RS3", 2019, "", 400, 280, 3.9, 82000, "rare", 13, "budget", 3],
  ["skyline-r34-99", "Nissan", "Skyline GT-R R34", 1999, "", 330, 260, 4.8, 140000, "epic", 16, "performance", 3],
  ["m2-18", "BMW M", "M2 Competition", 2018, "", 405, 280, 4.2, 110000, "epic", 15, "performance", 3],
  ["amg-a45-19", "Mercedes-AMG", "A 45 S", 2019, "", 416, 270, 3.9, 98000, "epic", 14, "performance", 3],
  ["rs6-20", "Audi", "RS6 Avant", 2020, "", 600, 305, 3.5, 175000, "epic", 21, "performance", 3],
  // ── Level 20–40 · sports cars ──
  ["m3-08", "BMW M", "M3 E92", 2008, "", 420, 250, 4.5, 145000, "epic", 20, "performance", 3],
  ["mustang-gt-15", "Ford", "Mustang GT", 2015, "", 435, 250, 4.3, 125000, "epic", 18, "performance", 3],
  ["camaro-ss-16", "Chevrolet", "Camaro SS", 2016, "", 455, 260, 4.2, 115000, "epic", 17, "performance", 3],
  ["911-carrera-97", "Porsche", "911 Carrera 993", 1997, "", 282, 270, 5.2, 200000, "epic", 24, "sports", 4],
  ["m4-18", "BMW M", "M4 Competition", 2018, "", 444, 250, 4.1, 175000, "epic", 22, "sports", 4],
  ["amg-c63-18", "Mercedes-AMG", "C 63 S", 2018, "", 510, 290, 3.9, 195000, "epic", 23, "sports", 4],
  ["corvette-c6-08", "Chevrolet", "Corvette C6 Z06", 2008, "", 505, 320, 3.7, 160000, "epic", 20, "sports", 4],
  // ── Level 30–60 · supercars ──
  ["911-turbo-s-19", "Porsche", "911 Turbo S", 2019, "", 650, 330, 2.7, 430000, "legendary", 33, "sports", 4],
  ["amg-gt-15", "Mercedes-AMG", "AMG GT", 2015, "", 503, 304, 3.9, 470000, "legendary", 35, "super", 4],
  ["r8-16", "Audi", "R8 V10 Plus", 2016, "", 610, 330, 3.2, 500000, "legendary", 36, "super", 4],
  ["mclaren-540c-15", "McLaren", "540C", 2015, "", 540, 320, 3.4, 620000, "legendary", 38, "super", 5],
  ["ferrari-458-12", "Ferrari", "458 Italia", 2012, "", 570, 325, 3.4, 720000, "legendary", 40, "super", 5],
  ["huracan-15", "Lamborghini", "Huracán", 2015, "", 602, 325, 3.2, 780000, "legendary", 42, "super", 5],
  ["vantage-18", "Aston Martin", "Vantage", 2018, "", 503, 314, 3.5, 540000, "legendary", 37, "super", 5],
  ["911-gt3-18", "Porsche", "911 GT3 RS", 2018, "", 513, 312, 3.2, 680000, "legendary", 39, "super", 5],
  ["amg-gt-black-18", "Mercedes-AMG", "GT Black Series", 2020, "", 720, 325, 3.2, 1250000, "exotic", 52, "hyper", 5],
  // ── Level 55–100 · hypercars ──
  ["mclaren-720s-17", "McLaren", "720S", 2017, "", 710, 341, 2.9, 1550000, "exotic", 55, "hyper", 6],
  ["ferrari-f8-19", "Ferrari", "F8 Tributo", 2019, "", 710, 340, 2.9, 1750000, "exotic", 58, "hyper", 6],
  ["aventador-17", "Lamborghini", "Aventador SVJ", 2017, "", 770, 352, 2.8, 1900000, "exotic", 60, "hyper", 6],
  ["porsche-918-15", "Porsche", "918 Spyder", 2015, "", 887, 345, 2.6, 3200000, "exotic", 65, "hyper", 6],
  ["laferrari-14", "Ferrari", "LaFerrari", 2014, "", 950, 350, 2.6, 5200000, "hyper", 72, "hyper", 7],
  ["mclaren-p1-14", "McLaren", "P1", 2014, "", 903, 350, 2.8, 4600000, "hyper", 70, "hyper", 7],
  ["veyron-16-4", "Bugatti", "Veyron 16.4", 2005, "bugatti-veyron-16-4", 1001, 407, 2.5, 6200000, "hyper", 75, "collector", 7],
  ["veneno-14", "Lamborghini", "Veneno", 2014, "", 740, 355, 2.9, 8400000, "hyper", 80, "collector", 7],
  // ── Level 90+ · legendaries, mythics, endgame ──
  ["revuelto-23", "Lamborghini", "Revuelto", 2023, "lamborghini-revuelto", 1015, 350, 2.5, 12500000, "hyper", 90, "collector", 7],
  ["daytona-sp3-22", "Ferrari", "Daytona SP3", 2022, "ferrari-daytona-sp3", 840, 340, 2.85, 16000000, "hyper", 95, "collector", 8],
  ["amg-one-22", "Mercedes-AMG", "Project ONE", 2022, "", 1063, 352, 2.9, 16500000, "hyper", 100, "collector", 8],
  ["agera-rs-17", "Koenigsegg", "Agera RS", 2017, "", 1160, 447, 2.6, 18500000, "mythic", 105, "collector", 8],
  ["chiron-17", "Bugatti", "Chiron", 2017, "bugatti-chiron", 1500, 420, 2.4, 21000000, "mythic", 110, "collector", 8],
  ["nevera-21", "Rimac", "Nevera", 2021, "rimac-nevera-r", 1914, 412, 1.85, 22500000, "mythic", 115, "collector", 8],
  ["tourbillon-26", "Bugatti", "Tourbillon", 2026, "bugatti-tourbillon", 1800, 445, 2.0, 32000000, "mythic", 125, "collector", 9],
  ["jesko-absolut-20", "Koenigsegg", "Jesko Absolut", 2020, "koenigsegg-jesko-absolut", 1600, 531, 2.4, 36000000, "mythic", 130, "collector", 9],
  ["imola-20", "Pagani", "Imola", 2020, "", 838, 350, 2.9, 42000000, "mythic", 135, "collector", 9],
  ["la-voiture-noire-19", "Bugatti", "La Voiture Noire", 2019, "", 1500, 420, 2.4, 65000000, "ultimate", 150, "vault", 10],
  ["boat-tail-21", "Rolls-Royce", "Boat Tail", 2021, "", 563, 250, 4.9, 110000000, "ultimate", 200, "vault", 10],
  ["crystal-one-24", "One-off", "Crystal Edition One", 2024, "", 2400, 520, 1.7, 300000000, "ultimate", 260, "vault", 10],
  ["infinity-one-27", "One-off", "Infinity One", 2027, "", 3000, 560, 1.5, 900000000, "ultimate", 330, "vault", 10],
];

export const GAME_CARS: GameCarDef[] = [
  ...rawCars.map(car),
  // Secret car — granted after 300 starter clicks, never sold or crated.
  {
    id: SECRET_CAR_ID,
    brand: "Ghost Division",
    name: "The Ghost Prototype",
    year: 2026,
    gallerySlug: "",
    hp: 2400,
    topSpeed: 520,
    accel: 1.7,
    value: 250000000,
    rarity: "ultimate",
    unlockLevel: 1,
    dealer: "vault",
    crateTier: 0,
    secret: true,
  },
];

export const GAME_CAR_MAP: Record<string, GameCarDef> = Object.fromEntries(
  GAME_CARS.map((c) => [c.id, c]),
);

// ── Dealerships ───────────────────────────────────────────────────────────────

const dealerIds = (ids: string[]) => ids;

export const DEALERS: DealerDef[] = [
  {
    id: "used",
    name: "Used Car Dealer",
    tagline: "Rust, hope and a full tank.",
    unlockLevel: 1,
    refreshCost: 150,
    slots: 4,
    pool: dealerIds([
      "rusty-hatch-91",
      "beater-sedan-87",
      "farm-pickup-80",
      "civic-lx-95",
      "corolla-se-97",
      "golf-mk3-94",
      "gti-mk2-90",
      "mx5-nb-00",
      "civic-si-99",
    ]),
  },
  {
    id: "budget",
    name: "Budget Imports",
    tagline: "90s JDM icons at dealer prices.",
    unlockLevel: 6,
    refreshCost: 900,
    slots: 4,
    pool: dealerIds([
      "supra-mk3-88",
      "skyline-gts-92",
      "brz-13",
      "supra-mk4-97",
      "golf-r-16",
      "type-r-17",
      "rs3-19",
      "skyline-r34-99",
    ]),
  },
  {
    id: "performance",
    name: "Performance Garage",
    tagline: "Tuned, boosted and ready.",
    unlockLevel: 14,
    refreshCost: 6000,
    slots: 4,
    pool: dealerIds([
      "m2-18",
      "amg-a45-19",
      "m3-08",
      "mustang-gt-15",
      "camaro-ss-16",
      "corvette-c6-08",
      "rs6-20",
      "m4-18",
    ]),
  },
  {
    id: "sports",
    name: "European Sports Dealer",
    tagline: "From the Alps to your driveway.",
    unlockLevel: 24,
    refreshCost: 25000,
    slots: 4,
    pool: dealerIds([
      "911-carrera-97",
      "amg-c63-18",
      "911-turbo-s-19",
      "vantage-18",
      "911-gt3-18",
      "amg-gt-15",
    ]),
  },
  {
    id: "super",
    name: "Supercar Dealership",
    tagline: "Loud, mid-engine, unapologetic.",
    unlockLevel: 36,
    refreshCost: 120000,
    slots: 4,
    pool: dealerIds([
      "r8-16",
      "mclaren-540c-15",
      "ferrari-458-12",
      "huracan-15",
      "911-gt3-18",
    ]),
  },
  {
    id: "hyper",
    name: "Hypercar House",
    tagline: "1,000 hp is the entry ticket.",
    unlockLevel: 55,
    refreshCost: 800000,
    slots: 4,
    pool: dealerIds([
      "amg-gt-black-18",
      "mclaren-720s-17",
      "ferrari-f8-19",
      "aventador-17",
      "porsche-918-15",
      "laferrari-14",
      "mclaren-p1-14",
      "veyron-16-4",
      "veneno-14",
    ]),
  },
  {
    id: "collector",
    name: "Exclusive Collector Dealer",
    tagline: "Invite-only. Bring everything.",
    unlockLevel: 90,
    refreshCost: 6000000,
    slots: 3,
    pool: dealerIds([
      "revuelto-23",
      "daytona-sp3-22",
      "amg-one-22",
      "agera-rs-17",
      "chiron-17",
      "nevera-21",
      "tourbillon-26",
      "jesko-absolut-20",
      "imola-20",
    ]),
  },
  {
    id: "vault",
    name: "The Vault",
    tagline: "The rarest machines on Earth.",
    unlockLevel: 150,
    refreshCost: 60000000,
    slots: 2,
    pool: dealerIds([
      "la-voiture-noire-19",
      "boat-tail-21",
      "crystal-one-24",
      "infinity-one-27",
    ]),
  },
];

export const DEALER_MAP: Record<string, DealerDef> = Object.fromEntries(
  DEALERS.map((d) => [d.id, d]),
);

// ── Upgrades ──────────────────────────────────────────────────────────────────

const u = (
  id: string,
  name: string,
  category: UpgradeDef["category"],
  icon: string,
  desc: string,
  baseCost: number,
  costScale: number,
  stages: number,
  effect: StatKey,
  perStage: number,
): UpgradeDef => ({
  id,
  name,
  category,
  icon,
  desc,
  baseCost,
  costScale,
  stages: Array.from({ length: stages }, (_, i) => ({
    cost: Math.round(baseCost * Math.pow(costScale, i)),
    effect: { [effect]: perStage },
  })),
});

export const UPGRADES: UpgradeDef[] = [
  {
    id: "condition",
    name: "Restoration",
    category: "restore",
    icon: "Brush",
    desc: "Wash, de-rust, rebuild. Brings the car back to life and multiplies everything it earns.",
    baseCost: 120,
    costScale: 2.4,
    stages: [
      { cost: 120, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
      { cost: 300, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
      { cost: 800, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
      { cost: 2200, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
      { cost: 6500, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
      { cost: 20000, effect: { valueMult: 0.18, clickMult: 0.1, passiveMult: 0.1 } },
    ],
  },
  u("engine", "Engine", "performance", "Cog", "Bigger lungs. More fire.", 500, 1.9, 7, "hpMult", 0.15),
  u("turbo", "Turbocharger", "performance", "Wind", "Boost builds, wheels spin.", 400, 2.0, 6, "clickMult", 0.2),
  u("ecu", "ECU Tune", "performance", "Cpu", "Unlocks what the factory hid.", 300, 1.8, 6, "passiveMult", 0.12),
  u("exhaust", "Exhaust", "performance", "Volume2", "Loud, free and angry.", 250, 1.85, 5, "clickMult", 0.1),
  u("transmission", "Transmission", "performance", "Settings2", "Gears that never miss.", 600, 2.0, 5, "passiveMult", 0.16),
  u("weight", "Weight Reduction", "performance", "Feather", "Strip it. Shed it. Fly.", 800, 2.1, 5, "clickMult", 0.18),
  u("tires", "Tires", "handling", "CircleDot", "Grip is everything.", 200, 1.8, 5, "passiveMult", 0.1),
  u("suspension", "Suspension", "handling", "Waves", "Flat through every corner.", 350, 1.9, 5, "passiveMult", 0.12),
  u("brakes", "Brakes", "handling", "Octagon", "Stop harder. Go sooner.", 250, 1.8, 5, "clickMult", 0.06),
  u("paint", "Paint Job", "cosmetic", "Paintbrush", "Shine sells.", 150, 1.7, 4, "valueMult", 0.07),
  u("wheels", "Wheels", "cosmetic", "CircleDotDashed", "Rolling art.", 180, 1.7, 4, "valueMult", 0.06),
  u("bodykit", "Body Kit", "cosmetic", "Box", "Aero that means business.", 500, 2.0, 4, "valueMult", 0.1),
  u("spoiler", "Spoiler", "cosmetic", "Plane", "Downforce, obviously.", 300, 1.9, 4, "clickMult", 0.08),
];

export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

// ── Parts (inventory) ─────────────────────────────────────────────────────────

export const PARTS: PartDef[] = [
  { id: "scrapyard-turbo", name: "Scrapyard Turbo", rarity: "common", value: 120, desc: "Found in the mud. It spins... sometimes.", clickMult: 0.02 },
  { id: "used-tires", name: "Used Tires", rarity: "common", value: 80, desc: "Plenty of thread left. Probably.", passiveMult: 0.02 },
  { id: "stock-exhaust", name: "Stock Exhaust", rarity: "common", value: 60, desc: "Whisper quiet. Zero personality.", clickMult: 0.01 },
  { id: "sport-ecu", name: "Sport ECU", rarity: "uncommon", value: 350, desc: "Factory tune, one step meaner.", clickMult: 0.04 },
  { id: "street-suspension", name: "Street Coilovers", rarity: "uncommon", value: 400, desc: "Low and stiff.", passiveMult: 0.04 },
  { id: "ceramic-brakes", name: "Ceramic Brakes", rarity: "rare", value: 1200, desc: "Fade-free, all day.", clickMult: 0.06 },
  { id: "forged-wheels", name: "Forged Wheels", rarity: "rare", value: 1500, desc: "Lighter, stronger, prettier.", passiveMult: 0.06 },
  { id: "race-turbo", name: "Race Turbo", rarity: "epic", value: 6000, desc: "Spooldaddy. Hang on.", clickMult: 0.12 },
  { id: "racing-clutch", name: "Racing Clutch", rarity: "epic", value: 8000, desc: "On/off. No in-between.", passiveMult: 0.1 },
  { id: "carbon-kit", name: "Carbon Body Kit", rarity: "legendary", value: 40000, desc: "Every panel signed by carbon.", clickMult: 0.2 },
  { id: "supercharger", name: "Supercharger", rarity: "legendary", value: 50000, desc: "Instant, brutal, whiny.", clickMult: 0.25 },
  { id: "hyper-engine", name: "Hyper Engine Block", rarity: "exotic", value: 250000, desc: "From a 4,000 hp prototype.", passiveMult: 0.3 },
  { id: "mythic-core", name: "Mythic Core", rarity: "mythic", value: 1500000, desc: "A complete sealed drivetrain. Unobtainium.", clickMult: 0.5 },
];

export const PART_MAP: Record<string, PartDef> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
);

// ── Crates ────────────────────────────────────────────────────────────────────

export const CRATES: CrateDef[] = [
  {
    id: "scrapyard",
    name: "Scrapyard Crate",
    icon: "Trash2",
    cost: 250,
    color: "#9ca3af",
    desc: "Mystery junk. Sometimes a miracle.",
    weights: { common: 62, uncommon: 28, rare: 8, epic: 2 },
    maxTier: 2,
    cashMin: 50,
    cashMax: 400,
  },
  {
    id: "import",
    name: "Import Container",
    icon: "Container",
    cost: 2500,
    color: "#38bdf8",
    desc: "Unclaimed cargo from across the sea.",
    weights: { common: 10, uncommon: 40, rare: 32, epic: 14, legendary: 4 },
    maxTier: 3,
    cashMin: 400,
    cashMax: 4200,
  },
  {
    id: "dealer",
    name: "Dealer Pack",
    icon: "Car",
    cost: 15000,
    color: "#a78bfa",
    desc: "Dealer plates included. No questions asked.",
    weights: { rare: 10, epic: 46, legendary: 34, exotic: 10 },
    maxTier: 4,
    cashMin: 2000,
    cashMax: 22000,
  },
  {
    id: "exotic",
    name: "Exotic Import",
    icon: "Rocket",
    cost: 120000,
    color: "#fb7185",
    desc: "Carbon, titanium and attitude.",
    weights: { epic: 12, legendary: 48, exotic: 34, hyper: 6 },
    maxTier: 6,
    cashMin: 15000,
    cashMax: 180000,
  },
  {
    id: "mythic",
    name: "Mythic Vault",
    icon: "Sparkles",
    cost: 1500000,
    color: "#c084fc",
    desc: "The collection agency keeps asking.",
    weights: { legendary: 8, exotic: 32, hyper: 44, mythic: 15, ultimate: 1 },
    maxTier: 8,
    cashMin: 250000,
    cashMax: 2200000,
  },
  {
    id: "vault",
    name: "The Diamond Vault",
    icon: "Gem",
    cost: 25000000,
    color: "#ffd700",
    desc: "One of one. Maybe two.",
    weights: { hyper: 20, mythic: 58, ultimate: 22 },
    maxTier: 10,
    cashMin: 4000000,
    cashMax: 40000000,
  },
];

export const CRATE_MAP: Record<string, CrateDef> = Object.fromEntries(
  CRATES.map((cr) => [cr.id, cr]),
);

// ── Achievements ──────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-click",
    name: "Engine Turn",
    desc: "Earn your first dollar.",
    check: (s) => s.totalEarned >= 1,
  },
  {
    id: "first-car",
    name: "First Purchase",
    desc: "Buy a second car.",
    check: (s) => Object.keys(s.ownedCars).length >= 2,
    rewardCash: 1000,
  },
  {
    id: "restored",
    name: "Full Restoration",
    desc: "Fully restore your starter car.",
    check: (s) => (s.ownedCars[STARTER_ID]?.upgrades.condition ?? 0) >= 6,
    rewardCash: 25000,
    rewardRep: 50,
  },
  {
    id: "earned-10k",
    name: "Mechanic's Wage",
    desc: "Earn $10,000 total.",
    check: (s) => s.totalEarned >= 10_000,
  },
  {
    id: "earned-1m",
    name: "Millionaire",
    desc: "Earn $1,000,000 total.",
    check: (s) => s.totalEarned >= 1_000_000,
    rewardRep: 200,
  },
  {
    id: "earned-100m",
    name: "Car Tycoon",
    desc: "Earn $100,000,000 total.",
    check: (s) => s.totalEarned >= 100_000_000,
    rewardRep: 1500,
  },
  {
    id: "own-5",
    name: "Collector's Start",
    desc: "Own 5 cars at once.",
    check: (s) => Object.keys(s.ownedCars).length >= 5,
  },
  {
    id: "own-15",
    name: "Garage King",
    desc: "Own 15 cars at once.",
    check: (s) => Object.keys(s.ownedCars).length >= 15,
    rewardCash: 500_000,
  },
  {
    id: "own-40",
    name: "Museum Curator",
    desc: "Own 40 cars at once.",
    check: (s) => Object.keys(s.ownedCars).length >= 40,
    rewardRep: 3000,
  },
  {
    id: "bugatti-set",
    name: "The Bugatti Trinity",
    desc: "Own all three Bugattis.",
    check: (s) =>
      ["veyron-16-4", "chiron-17", "tourbillon-26"].every((id) => s.ownedCars[id]),
    rewardCash: 50_000_000,
  },
  {
    id: "ferrari-set",
    name: "Ferrari Devotee",
    desc: "Own every Ferrari.",
    check: (s) =>
      ["ferrari-458-12", "laferrari-14", "daytona-sp3-22"].every((id) => s.ownedCars[id]),
    rewardCash: 30_000_000,
  },
  {
    id: "max-upgrade",
    name: "Maxed Out",
    desc: "Take every upgrade on one car to max.",
    check: (s) => {
      for (const owned of Object.values(s.ownedCars)) {
        const maxed = UPGRADES.every((ud) => (owned.upgrades[ud.id] ?? 0) >= ud.stages.length);
        if (maxed) return true;
      }
      return false;
    },
    rewardRep: 2000,
  },
  {
    id: "upgrades-10",
    name: "Getting Serious",
    desc: "Install 10 upgrade stages on one car.",
    check: (s) =>
      Object.values(s.ownedCars).some(
        (o) => Object.values(o.upgrades).reduce((a, b) => a + b, 0) >= 10,
      ),
  },
  {
    id: "upgrades-30",
    name: "Tuning Pro",
    desc: "Install 30 upgrade stages on one car.",
    check: (s) =>
      Object.values(s.ownedCars).some(
        (o) => Object.values(o.upgrades).reduce((a, b) => a + b, 0) >= 30,
      ),
    rewardCash: 1_000_000,
  },
  {
    id: "upgrades-60",
    name: "Workshop Legend",
    desc: "Install 60 upgrade stages on one car.",
    check: (s) =>
      Object.values(s.ownedCars).some(
        (o) => Object.values(o.upgrades).reduce((a, b) => a + b, 0) >= 60,
      ),
    rewardRep: 5000,
  },
  {
    id: "crates-5",
    name: "Junk Scavenger",
    desc: "Open 5 crates.",
    check: (s) => s.cratesOpened >= 5,
  },
  {
    id: "crates-25",
    name: "Crate Fiend",
    desc: "Open 25 crates.",
    check: (s) => s.cratesOpened >= 25,
    rewardCash: 500_000,
  },
  {
    id: "crates-100",
    name: "Importer",
    desc: "Open 100 crates.",
    check: (s) => s.cratesOpened >= 100,
    rewardRep: 2500,
  },
  {
    id: "mythic-owner",
    name: "Mythic Collector",
    desc: "Own a Mythic car.",
    check: (s) =>
      Object.keys(s.ownedCars).some((id) => GAME_CAR_MAP[id]?.rarity === "mythic"),
    rewardRep: 4000,
  },
  {
    id: "ultimate-owner",
    name: "One of One",
    desc: "Own an Ultimate car.",
    check: (s) =>
      Object.keys(s.ownedCars).some((id) => GAME_CAR_MAP[id]?.rarity === "ultimate"),
    rewardRep: 15000,
  },
  {
    id: "level-25",
    name: "Rising Star",
    desc: "Reach level 25.",
    check: (s) => levelFrom(s) >= 25,
  },
  {
    id: "level-100",
    name: "Legend",
    desc: "Reach level 100.",
    check: (s) => levelFrom(s) >= 100,
    rewardRep: 5000,
  },
  {
    id: "prestige-1",
    name: "Born Again",
    desc: "Prestige for the first time.",
    check: (s) => s.prestigeLevel >= 1,
  },
  {
    id: "secret-found",
    name: "The Barn Find",
    desc: "Discover the ghost prototype.",
    check: (s) => Boolean(s.ownedCars["ghost-prototype"]),
    rewardRep: 10000,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Player level, derived from total lifetime earnings. */
export function levelFrom(s: { totalEarned: number; prestigeLevel: number }): number {
  const base = 1 + Math.floor(Math.sqrt(Math.max(s.totalEarned, 0) / 500));
  return base + s.prestigeLevel * 10;
}

/** Index of the rarity (0 = common … 8 = ultimate). */
export const rarityIndex = (r: Rarity): number => RARITIES.indexOf(r);

/** Money + number formatting for the game UI. */
export function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}

/**
 * Direct Wikimedia photos for game cars the archive doesn't cover at all
 * (daily drivers & JDM icons). All URLs verified to serve HTTP 200.
 */
const GAME_CAR_IMAGES: Record<string, string> = {
  "civic-lx-95": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/96-98_Honda_Civic_LX_sedan.jpg/960px-96-98_Honda_Civic_LX_sedan.jpg",
  "corolla-se-97": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/1995-1997_Toyota_Corolla.jpg/960px-1995-1997_Toyota_Corolla.jpg",
  "golf-mk3-94": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/1996-1998_Volkswagen_Golf_%281H%29_CL_5-door_hatchback_03.jpg/960px-1996-1998_Volkswagen_Golf_%281H%29_CL_5-door_hatchback_03.jpg",
  "mx5-nb-00": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/1999_Mazda_MX-5_Miata_Base_in_Highlight_Silver_Metallic%2C_Front_Left%2C_08-06-2022.jpg/960px-1999_Mazda_MX-5_Miata_Base_in_Highlight_Silver_Metallic%2C_Front_Left%2C_08-06-2022.jpg",
  "gti-mk2-90": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/VW_Golf_II_front_20080206.jpg/960px-VW_Golf_II_front_20080206.jpg",
  "civic-si-99": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Philippine-Market_Honda_Civic_SiR_%28EK%29.jpg/960px-Philippine-Market_Honda_Civic_SiR_%28EK%29.jpg",
  "supra-mk3-88": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Toyota_Supra_%28A70%2C_pre-facelift%29_1X7A2556.jpg/960px-Toyota_Supra_%28A70%2C_pre-facelift%29_1X7A2556.jpg",
  "skyline-gts-92": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nissan_Skyline_R32_GT-R_001.jpg/960px-Nissan_Skyline_R32_GT-R_001.jpg",
  "brz-13": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Subaru_BRZ_%2C_Toronto.jpg/960px-Subaru_BRZ_%2C_Toronto.jpg",
  "golf-r-16": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/VOLKSWAGEN_GOLF_R-LINE_%28Mk7%2C_Typ_5G%29_China_%282%29.jpg/960px-VOLKSWAGEN_GOLF_R-LINE_%28Mk7%2C_Typ_5G%29_China_%282%29.jpg",
  "type-r-17": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Honda_CIVIC_TYPE_R_%28DBA-FK8%29.jpg/960px-Honda_CIVIC_TYPE_R_%28DBA-FK8%29.jpg",
  "supra-mk4-97": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/1996-2002_Toyota_Supra_rear.jpg/960px-1996-2002_Toyota_Supra_rear.jpg",
  "skyline-r34-99": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Nissan_Skyline_GT-R_R34_V_Spec_II.jpg/960px-Nissan_Skyline_GT-R_R34_V_Spec_II.jpg",
  "amg-a45-19": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg/960px-Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg",
  "mustang-gt-15": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2019_Ford_Mustang_GT_5.0_facelift.jpg/960px-2019_Ford_Mustang_GT_5.0_facelift.jpg",
  "camaro-ss-16": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2019_Chevrolet_Camaro_2SS_6.2L_front_3.16.19.jpg/960px-2019_Chevrolet_Camaro_2SS_6.2L_front_3.16.19.jpg",
  "corvette-c6-08": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chevrolet_Corvette_Z06_-_Flickr_-_Alexandre_Pr%C3%A9vot_%287%29_%28cropped%29.jpg/960px-Chevrolet_Corvette_Z06_-_Flickr_-_Alexandre_Pr%C3%A9vot_%287%29_%28cropped%29.jpg",
  // Rust City beaters — real rusty cars for the early game.
  "rusty-hatch-91": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Moscow%2C_Mitsubishi_Lancer_CY0_hatchback_rusty%2C_Aug_2025_01.jpg/960px-Moscow%2C_Mitsubishi_Lancer_CY0_hatchback_rusty%2C_Aug_2025_01.jpg",
  "beater-sedan-87": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Rusty_FSO_125p_1.5_L_krk.JPG/960px-Rusty_FSO_125p_1.5_L_krk.JPG",
  "farm-pickup-80": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Rusty_Ford_Truck%2C_Old_Metal%2C_NB_7-25-13_%2810784237423%29.jpg/960px-Rusty_Ford_Truck%2C_Old_Metal%2C_NB_7-25-13_%2810784237423%29.jpg",
  // Secret car — the mysterious black one-off.
  "ghost-prototype": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Bugatti_La_Voiture_Noire_%2850263623691%29.jpg/960px-Bugatti_La_Voiture_Noire_%2850263623691%29.jpg",
  // Endgame one-offs — real exotic photos for the fictional ultimates.
  "crystal-one-24": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/2017_Pagani_Zonda_HP_Barchetta_USG26.jpg/960px-2017_Pagani_Zonda_HP_Barchetta_USG26.jpg",
  "infinity-one-27": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Mercedes-AMG_One_IAA_2023_1X7A0454.jpg/960px-Mercedes-AMG_One_IAA_2023_1X7A0454.jpg",
};

/** Manual image overrides for game cars whose archive twin uses a different slug. */
const GAME_IMAGE_ALIASES: Record<string, string> = {
  "ferrari-458-12": "ferrari-488-gtb",
  "mclaren-540c-15": "mclaren-600lt",
  "911-carrera-97": "porsche-911-gt3",
  "imola-20": "pagani-huayra",
  "veneno-14": "lamborghini-aventador-svj",
};

const normTokens = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);

/**
 * Real Wikimedia photo for a game car, or "" to use the generated scene.
 * Resolves exact slug → manual alias → best brand+model fuzzy match.
 */
export function gameCarImage(def: GameCarDef): string {
  const direct = GAME_CAR_IMAGES[def.id];
  if (direct) return direct;
  const archive = carsList();
  const targetSlug = def.gallerySlug || GAME_IMAGE_ALIASES[def.id];
  if (targetSlug) {
    const exact = archive.find((c) => c.slug === targetSlug);
    if (exact) {
      const img = getCarImage(exact);
      if (img) return img;
    }
  }
  const brand = normTokens(def.brand).join(" ");
  const defTokens = normTokens(def.name).filter((t) => t.length >= 2);
  let best: { car: Car; score: number } | null = null;
  for (const c of archive) {
    const cBrand = normTokens(c.brand).join(" ");
    if (!(cBrand.includes(brand) || brand.includes(cBrand))) continue;
    const cTokens = normTokens(c.model);
    let score = 0;
    for (const t of defTokens) {
      if (cTokens.includes(t)) score += 10;
    }
    if (Math.abs(c.year - def.year) <= 3) score += 5;
    if (score >= 10 && (!best || score > best.score)) best = { car: c, score };
  }
  return best ? getCarImage(best.car) : "";
}
