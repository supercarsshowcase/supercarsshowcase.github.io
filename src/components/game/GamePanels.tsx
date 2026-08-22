import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brush,
  Car as CarIcon,
  CircleDot,
  CircleDotDashed,
  Cog,
  Container,
  Cpu,
  Feather,
  Gem,
  Gauge,
  KeyRound,
  Paintbrush,
  Plane,
  RefreshCw,
  Rocket,
  Settings2,
  Sparkles,
  Trash2,
  Volume2,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import {
  ACHIEVEMENTS,
  CRATES,
  DEALERS,
  GAME_CAR_MAP,
  PARTS,
  RARITY_META,
  STARTER_ID,
  UPGRADES,
  fmtMoney,
  fmtNum,
  gameCarImage,
  levelFrom,
} from "@/game/data";
import {
  buyPrice,
  carPower,
  carValue,
  rollCrate,
  rollDealerStock,
  upgradeCost,
  type Action,
} from "@/game/engine";
import type { CrateResult, GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const UPGRADE_ICONS: Record<string, LucideIcon> = {
  Brush,
  Cog,
  Wind,
  Cpu,
  Volume2,
  Settings2,
  Feather,
  CircleDot,
  Waves,
  Paintbrush,
  CircleDotDashed,
  Plane,
};

const CRATE_ICONS: Record<string, LucideIcon> = {
  Trash2,
  Container,
  CarIcon,
  Rocket,
  Sparkles,
  Gem,
};

const CATEGORY_LABEL: Record<string, string> = {
  restore: "Restoration",
  performance: "Performance",
  handling: "Handling",
  cosmetic: "Cosmetic",
};

export function GamePanels({
  tab,
  state,
  dispatch,
}: {
  tab: string;
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  if (tab === "dealer") return <DealerPanel state={state} dispatch={dispatch} />;
  if (tab === "crates") return <CratesPanel state={state} dispatch={dispatch} />;
  if (tab === "upgrades") return <UpgradesPanel state={state} dispatch={dispatch} />;
  if (tab === "inventory") return <InventoryPanel state={state} dispatch={dispatch} />;
  if (tab === "achievements") return <AchievementsPanel state={state} />;
  if (tab === "prestige") return <PrestigePanel state={state} dispatch={dispatch} />;
  return <GaragePanel state={state} dispatch={dispatch} />;
}

function PanelHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-display text-2xl font-black tracking-tight text-white">{title}</h3>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function RarityChip({ rarity }: { rarity: string }) {
  const meta = RARITY_META[rarity as keyof typeof RARITY_META];
  if (!meta) return null;
  return (
    <span
      className="rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
      style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}14` }}
    >
      {meta.label}
    </span>
  );
}

// ── Garage ────────────────────────────────────────────────────────────────────

function GaragePanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const ownedIds = Object.keys(state.ownedCars);
  const owned = ownedIds
    .map((id) => GAME_CAR_MAP[id])
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .sort((a, b) => carValue(state, b.id) - carValue(state, a.id));
  const canSell = ownedIds.length > 1;

  return (
    <div>
      <PanelHeader
        eyebrow="Collection"
        title="YOUR GARAGE"
        hint={`${ownedIds.length} machine${ownedIds.length === 1 ? "" : "s"} · total value ${fmtMoney(
          owned.reduce((s, c) => s + carValue(state, c.id), 0),
        )}`}
      />
      {owned.length === 0 ? (
        <p className="text-sm text-white/40">No cars yet. Visit the dealers.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map((c) => {
            const isActive = c.id === state.activeCarId;
            const upCount = Object.values(state.ownedCars[c.id]?.upgrades ?? {}).reduce(
              (s, n) => s + n,
              0,
            );
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-apex-panel transition-colors",
                  isActive ? "border-apex-red/60" : "border-apex-line hover:border-white/25",
                )}
              >
                <div className="relative h-36 overflow-hidden bg-[#0a0a0b]">
                  <SmartImage
                    src={gameCarImage(c)}
                    alt={c.name}
                    seed={c.id}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-2 top-2">
                    <RarityChip rarity={c.rarity} />
                  </div>
                  {isActive && (
                    <span className="absolute right-2 top-2 rounded-sm bg-apex-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                      Active
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    {c.brand} · {c.year}
                  </p>
                  <h4 className="mt-0.5 font-display text-lg font-black tracking-tight text-white">
                    {c.name}
                  </h4>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-white/40">
                      <span className="font-display font-black text-apex-red">
                        {fmtMoney(carValue(state, c.id))}
                      </span>{" "}
                      value
                    </span>
                    <span className="text-white/40">
                      <span className="font-display font-black text-white">
                        {fmtNum(carPower(state, c.id))}
                      </span>{" "}
                      hp
                    </span>
                    <span className="text-white/40">{upCount} upgrades</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "SET_ACTIVE", id: c.id })}
                        className="flex-1 rounded-md border border-apex-red/40 bg-apex-red/10 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red"
                      >
                        Drive
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canSell}
                      onClick={() => {
                        if (window.confirm(`Sell the ${c.name} for ${fmtMoney(Math.round(carValue(state, c.id) * 0.6))}?`)) {
                          dispatch({ type: "SELL_CAR", id: c.id });
                        }
                      }}
                      className="flex-1 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-apex-red hover:text-apex-red disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Sell
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dealers ───────────────────────────────────────────────────────────────────

function DealerPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const level = levelFrom(state);

  return (
    <div>
      <PanelHeader
        eyebrow="Dealerships"
        title="BUY MACHINES"
        hint="Stock rotates when you refresh it. Level up to unlock the bigger showrooms."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DEALERS.map((dealer) => {
          const locked = level < dealer.unlockLevel;
          const stock = state.dealerStock[dealer.id] ?? [];
          return (
            <div
              key={dealer.id}
              className={cn(
                "rounded-xl border bg-apex-panel p-4",
                locked ? "border-white/10 opacity-60" : "border-apex-line",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-display text-lg font-black tracking-tight text-white">
                    {dealer.name}
                  </h4>
                  <p className="text-[11px] text-white/40">{dealer.tagline}</p>
                </div>
                {locked ? (
                  <span className="rounded-sm border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                    Level {dealer.unlockLevel}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={state.cash < dealer.refreshCost}
                    onClick={() =>
                      dispatch({
                        type: "REFRESH_DEALER",
                        dealerId: dealer.id,
                        stock: rollDealerStock(dealer),
                        refreshAt: Date.now(),
                        cost: dealer.refreshCost,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white disabled:opacity-30"
                  >
                    <RefreshCw className="size-3" />
                    {fmtMoney(dealer.refreshCost)}
                  </button>
                )}
              </div>

              {locked ? (
                <p className="text-xs text-white/30">
                  Reach level {dealer.unlockLevel} to walk this floor.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {stock.map((carId) => {
                    const c = GAME_CAR_MAP[carId];
                    if (!c) return null;
                    const owned = Boolean(state.ownedCars[carId]);
                    const levelOk = level >= c.unlockLevel;
                    const price = buyPrice(carId);
                    const canBuy = !owned && levelOk && state.cash >= price;
                    return (
                      <div
                        key={carId}
                        className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0d]"
                      >
                        <div className="relative h-20 bg-[#0a0a0b]">
                          <SmartImage
                            src={gameCarImage(c)}
                            alt={c.name}
                            seed={carId}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute left-1.5 top-1.5">
                            <RarityChip rarity={c.rarity} />
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
                            {c.brand} · {c.year}
                          </p>
                          <p className="truncate font-display text-sm font-black text-white">
                            {c.name}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-display text-xs font-black text-apex-red">
                              {fmtMoney(price)}
                            </span>
                            <button
                              type="button"
                              disabled={!canBuy}
                              onClick={() => dispatch({ type: "BUY_CAR", id: carId })}
                              className="rounded-md bg-apex-red px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                            >
                              {owned ? "Owned" : levelOk ? "Buy" : `Lv ${c.unlockLevel}`}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Crates ────────────────────────────────────────────────────────────────────

function CratesPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [reveal, setReveal] = useState<CrateResult | null>(null);

  const open = (crateId: string) => {
    const result = rollCrate(state, crateId);
    dispatch({ type: "OPEN_CRATE", crateId, result });
    setReveal(result);
  };

  return (
    <div>
      <PanelHeader
        eyebrow="Loot"
        title="CAR CRATES"
        hint={`${state.cratesOpened} crates opened. Cars, parts or cash inside — rarity decides everything.`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CRATES.map((crate) => {
          const Icon = CRATE_ICONS[crate.icon] ?? Sparkles;
          const canAfford = state.cash >= crate.cost;
          return (
            <div
              key={crate.id}
              className="group flex flex-col rounded-xl border border-apex-line bg-apex-panel p-5 transition-colors hover:border-white/25"
            >
              <div
                className="mb-4 flex size-12 items-center justify-center rounded-lg border"
                style={{ borderColor: crate.color, color: crate.color, background: `${crate.color}14` }}
              >
                <Icon className="size-6" />
              </div>
              <h4 className="font-display text-lg font-black tracking-tight text-white">
                {crate.name}
              </h4>
              <p className="mt-1 flex-1 text-xs text-white/40">{crate.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-display text-sm font-black text-apex-red">
                  {fmtMoney(crate.cost)}
                </span>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => open(crate.id)}
                  className="rounded-md border border-apex-red/50 bg-apex-red/10 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
                >
                  Open
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setReveal(null)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#101012] p-6 text-center shadow-2xl"
            >
              {reveal.kind === "car" && reveal.carId && GAME_CAR_MAP[reveal.carId] && (
                <CrateCarReveal carId={reveal.carId} />
              )}
              {reveal.kind === "part" && reveal.partId && (
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                    Part dropped
                  </p>
                  <p className="mt-2 font-display text-2xl font-black text-white">
                    {PARTS.find((p) => p.id === reveal.partId)?.name ?? "Part"}
                  </p>
                </div>
              )}
              {reveal.kind === "cash" && (
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                    Cash found
                  </p>
                  <p className="mt-2 font-display text-3xl font-black text-apex-red">
                    +{fmtMoney(reveal.cash ?? 0)}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setReveal(null)}
                className="mt-6 w-full rounded-md border border-white/15 py-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
              >
                Claim
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CrateCarReveal({ carId }: { carId: string }) {
  const c = GAME_CAR_MAP[carId];
  if (!c) return null;
  const meta = RARITY_META[c.rarity];
  return (
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
        Car unlocked
      </p>
      <div
        className="mx-auto mt-4 h-32 w-full overflow-hidden rounded-lg border"
        style={{ borderColor: meta.color, boxShadow: `0 0 40px ${meta.color}33` }}
      >
        <SmartImage
          src={gameCarImage(c)}
          alt={c.name}
          seed={carId}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: meta.color }}>
        {meta.label}
      </p>
      <p className="mt-1 font-display text-2xl font-black text-white">{c.name}</p>
      <p className="text-xs text-white/40">
        {c.brand} · {fmtMoney(c.value)} · {fmtNum(c.hp)} hp
      </p>
    </div>
  );
}

// ── Upgrades ──────────────────────────────────────────────────────────────────

function UpgradesPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const active = GAME_CAR_MAP[state.activeCarId] ?? GAME_CAR_MAP[STARTER_ID];
  const owned = state.ownedCars[state.activeCarId]?.upgrades ?? {};
  const categories = ["restore", "performance", "handling", "cosmetic"] as const;

  return (
    <div>
      <PanelHeader
        eyebrow="Workshop"
        title={`UPGRADE · ${active.name.toUpperCase()}`}
        hint="Every stage costs more. Restoration multiplies everything; performance boosts clicks, income or power."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {categories.map((cat) => (
          <div key={cat} className="rounded-xl border border-apex-line bg-apex-panel p-4">
            <h4 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              {CATEGORY_LABEL[cat]}
            </h4>
            <div className="space-y-3">
              {UPGRADES.filter((u) => u.category === cat).map((up) => {
                const stage = owned[up.id] ?? 0;
                const maxed = stage >= up.stages.length;
                const cost = upgradeCost(state, state.activeCarId, up.id);
                const Icon = UPGRADE_ICONS[up.icon] ?? Wrench;
                const canBuy = !maxed && state.cash >= cost;
                return (
                  <div key={up.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0c0c0d] p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/60">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-display text-sm font-bold text-white">{up.name}</p>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                          {maxed ? "Maxed" : `Stage ${stage + 1}/${up.stages.length}`}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-white/35">{up.desc}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {up.stages.map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full",
                              i < stage ? "bg-apex-red" : "bg-white/10",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => dispatch({ type: "BUY_UPGRADE", upgradeId: up.id })}
                      className="shrink-0 rounded-md bg-apex-red px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                    >
                      {maxed ? "Maxed" : fmtMoney(cost)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inventory / parts ─────────────────────────────────────────────────────────

function InventoryPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const held = PARTS.filter((p) => (state.inventory[p.id] ?? 0) > 0);
  return (
    <div>
      <PanelHeader
        eyebrow="Parts Bin"
        title="INVENTORY"
        hint="Held parts add permanent global bonuses per copy. Sell duplicates for cash."
      />
      {held.length === 0 ? (
        <p className="text-sm text-white/40">
          Empty. Open crates to collect performance parts.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {held.map((p) => {
            const count = state.inventory[p.id] ?? 0;
            const bonus = [
              p.clickMult ? `+${Math.round(p.clickMult * 100)}% click` : "",
              p.passiveMult ? `+${Math.round(p.passiveMult * 100)}% income` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={p.id} className="rounded-xl border border-apex-line bg-apex-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <RarityChip rarity={p.rarity} />
                    <h4 className="mt-2 font-display text-base font-black text-white">{p.name}</h4>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
                    ×{count}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/40">{p.desc}</p>
                <p className="mt-1 text-[11px] font-semibold text-apex-red">{bonus || "Cosmetic"}</p>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SELL_PART", partId: p.id })}
                  className="mt-3 w-full rounded-md border border-white/15 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-apex-red"
                >
                  Sell for {fmtMoney(p.value)}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────────

function AchievementsPanel({ state }: { state: GameState }) {
  return (
    <div>
      <PanelHeader
        eyebrow="Feats"
        title="ACHIEVEMENTS"
        hint={`${state.achievements.length}/${ACHIEVEMENTS.length} unlocked. Rewards pay out automatically.`}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const done = state.achievements.includes(a.id);
          return (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3",
                done ? "border-apex-red/40 bg-apex-red/5" : "border-white/10 bg-apex-panel opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border font-display text-xs font-black",
                  done ? "border-apex-red bg-apex-red text-white" : "border-white/15 text-white/30",
                )}
              >
                {done ? "✓" : "•"}
              </span>
              <div className="min-w-0">
                <p className={cn("truncate font-display text-sm font-bold", done ? "text-white" : "text-white/60")}>
                  {a.name}
                </p>
                <p className="truncate text-[11px] text-white/40">{a.desc}</p>
              </div>
              {(a.rewardCash ?? 0) > 0 && (
                <span className="ml-auto shrink-0 text-[11px] font-bold text-apex-red">
                  {fmtMoney(a.rewardCash ?? 0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Prestige ──────────────────────────────────────────────────────────────────

function PrestigePanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const req = 5000 * (state.prestigeLevel + 1);
  const ready = state.reputation >= req;
  return (
    <div>
      <PanelHeader
        eyebrow="Rebirth"
        title="PRESTIGE"
        hint="Reset cash, cars, parts and stock for a permanent +50% income/click bonus per level."
      />
      <div className="max-w-lg rounded-xl border border-apex-line bg-apex-panel p-5">
        <div className="flex items-center gap-3">
          <KeyRound className="size-5 text-apex-red" />
          <div>
            <p className="font-display text-lg font-black text-white">
              Reputation {fmtNum(state.reputation)} / {fmtNum(req)}
            </p>
            <p className="text-[11px] text-white/40">
              Prestige level {state.prestigeLevel} · next bonus +50% earnings
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-apex-red"
            style={{ width: `${Math.min(100, (state.reputation / req) * 100)}%` }}
          />
        </div>
        <div className="mt-4 space-y-1 text-[11px] text-white/40">
          <p>Keeps: prestige level, achievements, lifetime earnings.</p>
          <p>Resets: cash, cars, parts, dealer stock, daily streak.</p>
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (window.confirm("Prestige now? You will lose all cars and cash for a permanent +50% bonus.")) {
              dispatch({ type: "PRESTIGE" });
              toast.success(`Prestige ${state.prestigeLevel + 1} reached`);
            }
          }}
          className="mt-4 w-full rounded-md bg-apex-red py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
        >
          {ready ? "Prestige" : `Need ${fmtNum(req - state.reputation)} more rep`}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[Gauge, Zap, Sparkles].map((Icon, i) => (
          <div key={i} className="rounded-xl border border-apex-line bg-apex-panel p-4">
            <Icon className="size-5 text-apex-red" />
            <p className="mt-2 font-display text-sm font-bold text-white">
              {["+50% earnings", "+2.5× clicks", "Better luck"][i]}
            </p>
            <p className="text-[10px] text-white/40">per prestige level</p>
          </div>
        ))}
      </div>
    </div>
  );
}
