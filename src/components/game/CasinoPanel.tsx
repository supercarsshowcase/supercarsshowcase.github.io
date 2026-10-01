/**
 * CasinoPanel — Full casino with chip system, car gambling, and car prizes.
 * All emojis replaced with Lucide icons and custom Apex-themed styled elements.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Target,
  TrendingUp,
  Crosshair,
  Zap,
  Swords,
  Star,
  Trophy,
  XCircle,
  Award,
  CircleDot,
  Flame,
  Diamond,
  Bomb,
  DollarSign,
  Car,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
} from "lucide-react";
import type { GameState } from "@/game/types";
import type { Action } from "@/game/engine";
import { GAME_CAR_MAP } from "@/game/data";
import { minesMultiplier, pickWeighted } from "@/game/casino-math";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { OnlineCoinflip as OnlineCoinflipReal, sfx } from "@/components/game/OnlineCoinflip";

/* ── Types ─────────────────────────────────────────────────────────────── */
type GameId =
  | "lobby"
  | "coinflip"
  | "roulette"
  | "crash"
  | "mines"
  | "jackpot"
  | "online-coinflip"
  | "online-jackpot"
  | "trade-cars";

interface GameDef {
  id: GameId;
  name: string;
  icon: React.ReactNode;
  category: "game" | "online";
  desc: string;
}

const GAMES: GameDef[] = [
  { id: "coinflip", name: "Coinflip", icon: <CircleDot className="size-7 text-amber-400" />, category: "game", desc: "Pick heads or tails" },
  { id: "roulette", name: "Roulette", icon: <Target className="size-7 text-apex-red" />, category: "game", desc: "Bet on numbers, colors, or ranges" },
  { id: "crash", name: "Crash", icon: <TrendingUp className="size-7 text-green-400" />, category: "game", desc: "Cash out before it crashes" },
  { id: "mines", name: "Mines", icon: <Crosshair className="size-7 text-white/70" />, category: "game", desc: "Avoid the mines" },
  { id: "jackpot", name: "Jackpot", icon: <Zap className="size-7 text-amber-400" />, category: "game", desc: "Pool cash or cars for the big win" },
  { id: "online-coinflip", name: "Online Coinflip 1v1", icon: <Swords className="size-7 text-blue-400" />, category: "online", desc: "Real 1v1 vs other players" },
  { id: "online-jackpot", name: "Online Jackpot", icon: <Star className="size-7 text-purple-400" />, category: "online", desc: "Pool with others" },
];

// Casino-exclusive prize cars (can only be won, not bought)
const CASINO_PRIZE_CARS = [
  { id: "casino-infinity", brand: "One-off", name: "Infinity One Casino", value: 1000000000, rarity: "ultimate" as const, chance: 0.005 },
  { id: "casino-crystal", brand: "One-off", name: "Crystal Edition Casino", value: 500000000, rarity: "ultimate" as const, chance: 0.008 },
  { id: "casino-boat-tail", brand: "Rolls-Royce", name: "Boat Tail Casino Edition", value: 200000000, rarity: "ultimate" as const, chance: 0.012 },
  { id: "casino-noire", brand: "Bugatti", name: "La Voiture Noire Casino", value: 100000000, rarity: "ultimate" as const, chance: 0.018 },
  { id: "casino-imola", brand: "Pagani", name: "Imola Casino Edition", value: 65000000, rarity: "mythic" as const, chance: 0.03 },
  { id: "casino-jesko", brand: "Koenigsegg", name: "Jesko Absolut Casino", value: 48000000, rarity: "mythic" as const, chance: 0.025 },
  { id: "casino-tourbillon", brand: "Bugatti", name: "Tourbillon Casino Edition", value: 42000000, rarity: "mythic" as const, chance: 0.035 },
  { id: "casino-sian", brand: "Lamborghini", name: "Sián Casino Special", value: 35000000, rarity: "mythic" as const, chance: 0.04 },
  { id: "casino-chiron-super", brand: "Bugatti", name: "Chiron Super Sport Casino", value: 30000000, rarity: "mythic" as const, chance: 0.05 },
  { id: "casino-chiron", brand: "Bugatti", name: "Chiron Casino Edition", value: 25000000, rarity: "mythic" as const, chance: 0.055 },
  { id: "casino-nevera", brand: "Rimac", name: "Nevera Casino Edition", value: 22000000, rarity: "mythic" as const, chance: 0.06 },
  { id: "casino-agera", brand: "Koenigsegg", name: "Agera RS Casino", value: 18000000, rarity: "mythic" as const, chance: 0.065 },
  { id: "casino-revuelto", brand: "Lamborghini", name: "Revuelto Casino Edition", value: 12500000, rarity: "hyper" as const, chance: 0.08 },
  { id: "casino-812", brand: "Ferrari", name: "812 Casino Special", value: 12000000, rarity: "hyper" as const, chance: 0.09 },
  { id: "casino-daytona", brand: "Ferrari", name: "Daytona SP3 Casino", value: 10000000, rarity: "hyper" as const, chance: 0.09 },
  { id: "casino-one", brand: "Mercedes-AMG", name: "Project ONE Casino", value: 9000000, rarity: "hyper" as const, chance: 0.09 },
  { id: "casino-veneno", brand: "Lamborghini", name: "Veneno Casino Edition", value: 8400000, rarity: "hyper" as const, chance: 0.09 },
  { id: "casino-765lt", brand: "McLaren", name: "765LT Casino Edition", value: 8000000, rarity: "exotic" as const, chance: 0.10 },
  { id: "casino-p1", brand: "McLaren", name: "P1 Casino Edition", value: 5500000, rarity: "hyper" as const, chance: 0.10 },
  { id: "casino-laferrari", brand: "Ferrari", name: "LaFerrari Casino", value: 5200000, rarity: "hyper" as const, chance: 0.10 },
  { id: "casino-veyron", brand: "Bugatti", name: "Veyron Casino Edition", value: 4500000, rarity: "hyper" as const, chance: 0.10 },
  { id: "casino-918", brand: "Porsche", name: "918 Spyder Casino", value: 3200000, rarity: "exotic" as const, chance: 0.12 },
  { id: "casino-gt-black", brand: "Mercedes-AMG", name: "GT Black Series Casino", value: 2000000, rarity: "legendary" as const, chance: 0.15 },
  { id: "casino-huracan", brand: "Lamborghini", name: "Huracán Casino Edition", value: 1500000, rarity: "legendary" as const, chance: 0.15 },
  { id: "casino-911-gt3", brand: "Porsche", name: "911 GT3 RS Casino", value: 1200000, rarity: "legendary" as const, chance: 0.18 },
  { id: "casino-f458", brand: "Ferrari", name: "458 Italia Casino", value: 900000, rarity: "legendary" as const, chance: 0.20 },
  { id: "casino-r8", brand: "Audi", name: "R8 V10 Casino Edition", value: 750000, rarity: "legendary" as const, chance: 0.20 },
  { id: "casino-720s", brand: "McLaren", name: "720S Casino Edition", value: 650000, rarity: "exotic" as const, chance: 0.25 },
  { id: "casino-vantage", brand: "Aston Martin", name: "Vantage Casino Edition", value: 500000, rarity: "legendary" as const, chance: 0.25 },
  { id: "casino-amg-gt", brand: "Mercedes-AMG", name: "AMG GT Casino Edition", value: 400000, rarity: "legendary" as const, chance: 0.30 },
];

/** Roll a casino prize car. Returns the car name if won, null otherwise. */
function checkCasinoPrize(dispatch: React.Dispatch<Action>): string | null {
  for (const prize of CASINO_PRIZE_CARS) {
    if (Math.random() < prize.chance) {
      dispatch({ type: "ADD_CAR", carId: prize.id });
      return `${prize.brand} ${prize.name}`;
    }
  }
  return null;
}

/* ── Custom Styled Icon Components ─────────────────────────────────────── */
function CoinIcon({ side, size = "md" }: { side: "heads" | "tails" | "unknown"; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-8 text-[11px]", md: "size-12 text-sm", lg: "size-16 text-lg" };
  return (
    <div className={cn("rounded-full border-2 flex items-center justify-center font-display font-black transition-all duration-300", sizes[size],
      side === "heads" ? "border-amber-500 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-900 shadow-lg shadow-amber-500/30"
        : side === "tails" ? "border-gray-400 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 shadow-lg shadow-gray-400/30"
        : "border-white/30 bg-white/10 text-white/50"
    )}>
      {side === "heads" ? "H" : side === "tails" ? "T" : "?"}
    </div>
  );
}

function CarChip({ label, value, type }: { label: string; value: number; type: "cash" | "car" }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold",
      type === "car" ? "border-purple-500/30 bg-purple-500/10 text-purple-300" : "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300/90"
    )}>
      <span className="flex min-w-0 items-center gap-2">
        {type === "car" ? <Car className="size-4 shrink-0 text-purple-400" /> : <DollarSign className="size-4 shrink-0 text-emerald-400" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 tabular-nums">${value.toLocaleString()}</span>
    </div>
  );
}

function ResultBadge({ won, children }: { won: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={cn("relative flex items-center gap-3 overflow-hidden rounded-2xl border px-7 py-4 text-center font-display text-lg font-black tracking-wide sm:px-10 sm:py-5 sm:text-2xl",
        won ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_50px_-12px_rgba(16,185,129,0.7)]" : "border-red-500/40 bg-red-500/10 text-red-300 shadow-[0_0_50px_-12px_rgba(239,68,68,0.7)]"
      )}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      {won ? <Trophy className="size-7 shrink-0 sm:size-8" /> : <XCircle className="size-7 shrink-0 sm:size-8" />}
      <span>{children}</span>
    </motion.div>
  );
}

/* ── Shared: Play Again ─────────────────────────────────────── */
function PlayAgainButton({ onClick, disabled, label = "Play Again" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-amber-400/50 bg-gradient-to-b from-amber-400/15 to-amber-500/5 px-8 py-3.5 font-display text-sm font-black uppercase tracking-[0.18em] text-amber-300 transition-all hover:border-amber-300 hover:bg-amber-400/20 hover:shadow-[0_0_30px_-6px_rgba(251,191,36,0.65)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none">
      <RotateCcw className="size-4 transition-transform duration-300 group-hover:-rotate-180" />{label}
    </button>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────────── */
export function CasinoPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [game, setGame] = useState<GameId>("lobby");
  const back = () => setGame("lobby");

  return (
    <div className="space-y-6">
      {game === "lobby" ? (
        <CasinoLobby state={state} dispatch={dispatch} onSelect={setGame} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={game} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button type="button" onClick={back}
              className="group mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 transition-all hover:border-apex-red hover:text-white">
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to Casino
            </button>
            {game === "coinflip" && <CoinflipGame state={state} dispatch={dispatch} />}
            {game === "roulette" && <RouletteGame state={state} dispatch={dispatch} />}
            {game === "crash" && <CrashGame state={state} dispatch={dispatch} />}
            {game === "mines" && <MinesGame state={state} dispatch={dispatch} />}
            {game === "jackpot" && <JackpotGame state={state} dispatch={dispatch} />}
            {game === "online-coinflip" && <OnlineCoinflipReal state={state} dispatch={dispatch} />}
            {game === "online-jackpot" && <OnlineJackpot state={state} dispatch={dispatch} />}
            {game === "trade-cars" && <TradeCarsPanel state={state} dispatch={dispatch} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Casino Lobby ──────────────────────────────────────────────────────── */
/** One selectable table card — gold sweep accent, medallion, badges. */
function LobbyCard({ g, onSelect }: { g: GameDef; onSelect: (g: GameId) => void }) {
  return (
    <button key={g.id} type="button" onClick={() => onSelect(g.id)}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#141417] to-[#0e0e11] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_44px_-18px_rgba(251,191,36,0.35)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-apex-red via-amber-500 to-apex-red opacity-70 transition-all duration-300 group-hover:w-full group-hover:opacity-[0.06]" />
      <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10 transition-all duration-300 group-hover:scale-110 group-hover:from-amber-400/20 group-hover:to-amber-500/5 group-hover:ring-amber-400/40">{g.icon}</div>
      <div className="relative min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-white transition-colors group-hover:text-amber-300">
          {g.name}
          {g.id === "online-jackpot" && <span className="ml-2 rounded bg-apex-red px-2 py-0.5 text-[11px] font-bold uppercase text-white">NEW!</span>}
          {g.id === "online-coinflip" && <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-400"><span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />Live</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/40">{g.desc}</p>
      </div>
      <ChevronRight className="relative size-4 shrink-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-300" />
    </button>
  );
}

function CasinoLobby({ state, dispatch, onSelect }: { state: GameState; dispatch: React.Dispatch<Action>; onSelect: (g: GameId) => void }) {
  const offline = GAMES.filter((g) => g.category === "game");
  const online = GAMES.filter((g) => g.category === "online");
  void dispatch;

  return (
    <div className="space-y-7">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#171114] via-[#101013] to-[#0c0c0f] p-6 sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 right-0 h-56 w-72 rounded-full bg-apex-red/10 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-6 hidden font-display text-8xl font-black tracking-tighter text-white/[0.03] sm:block">CASINO</span>
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400/80">
              <span className="h-px w-6 bg-amber-400/60" /> Apex Casino
            </p>
            <h2 className="mt-1.5 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
              Pick Your Table
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
              House odds, real stakes — five tables below, live heads-up play on the right.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-2.5">
              <DollarSign className="size-4 text-emerald-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Balance</p>
                <p className="font-display text-sm font-black tabular-nums text-white">
                  ${state.cash.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-apex-red/25 bg-apex-red/[0.07] px-4 py-2.5">
              <Car className="size-4 text-apex-red" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Cars</p>
                <p className="font-display text-sm font-black tabular-nums text-white">
                  {Object.keys(state.ownedCars).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <p className="mb-3 flex items-center justify-between font-display text-xs font-bold uppercase tracking-[0.25em] text-white/45">
            <span className="flex items-center gap-2"><span className="h-3 w-1 rounded-full bg-apex-red" />Games</span>
            <span className="text-white/25 tabular-nums">{offline.length} tables</span>
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {offline.map((g) => <LobbyCard key={g.id} g={g} onSelect={onSelect} />)}
          </div>
        </section>
        <section>
          <p className="mb-3 flex items-center justify-between font-display text-xs font-bold uppercase tracking-[0.25em] text-white/45">
            <span className="flex items-center gap-2"><span className="h-3 w-1 rounded-full bg-blue-500" />Online Games</span>
            <span className="text-white/25 tabular-nums">{online.length} tables</span>
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {online.map((g) => <LobbyCard key={g.id} g={g} onSelect={onSelect} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Trade Cars Panel ──────────────────────────────────────────────────── */
function TradeCarsPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const ownedCars = useMemo(() =>
    Object.keys(state.ownedCars).map((id) => GAME_CAR_MAP[id]).filter(Boolean).filter((c) => c.id !== state.activeCarId),
    [state.ownedCars, state.activeCarId]
  );

  const trade = (carId: string) => {
    const car = GAME_CAR_MAP[carId];
    if (!car) return;
    // Guard BEFORE paying: REMOVE_CAR refuses to strip the last car, so the
    // old order paid +70% value while the car stayed — an infinite printer.
    if (Object.keys(state.ownedCars).length <= 1) {
      return toast.error("You can't trade your last car!");
    }
    const chipValue = Math.floor(car.value * 0.7);
    dispatch({ type: "REMOVE_CAR", carId });
    dispatch({ type: "ADD_CASH", amount: chipValue });
    toast.success(`Traded ${car.name} for $${chipValue.toLocaleString()} cash!`);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111114] p-6">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      <div className="mb-2 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10"><Car className="size-5 text-amber-300" /></span>
        <div>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/70">Apex Casino</p>
          <h3 className="font-display text-xl font-black text-white">Trade Cars for Cash</h3>
        </div>
      </div>
      <p className="mb-4 text-xs text-white/40">Sell your cars at 70% market value to fund your casino games.</p>
      {ownedCars.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/30">No cars to trade.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
          {ownedCars.map((car) => (
            <div key={car.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0a0c] p-3 transition-colors hover:border-apex-red/40">
              <Car className="size-4 shrink-0 text-white/30" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-white">{car.brand} {car.name}</p>
                <p className="text-[11px] text-white/30">${Math.floor(car.value * 0.7).toLocaleString()} cash</p>
              </div>
              <button type="button" onClick={() => trade(car.id)}
                className="shrink-0 rounded-lg bg-apex-red/80 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-apex-red">
                Trade
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helper: Bet Input ─────────────────────────────────────────────────── */
function BetInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const presets = [1000, 10000, 100000, 1000000, 10000000];
  return (
    <div className="w-full max-w-lg space-y-3">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="mb-2 flex items-center justify-between px-1.5">
          <span className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            <DollarSign className="size-3 text-emerald-400" /> Wager
          </span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-white/30 tabular-nums">
            Max ${max.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(Math.max(1, Math.floor(value / 2)))}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 font-display text-xs font-black text-white/50 transition-colors hover:border-white/30 hover:text-white">
            <ChevronLeft className="size-3.5" /> ½
          </button>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-black text-emerald-400/70">$</span>
            <input type="number" value={value} max={max}
              onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              onBlur={() => onChange(Math.max(1, Math.min(max, value)))}
              className="w-full rounded-xl border border-white/15 bg-[#070708] py-3 pl-8 pr-4 text-right font-display text-lg font-black tabular-nums text-white outline-none transition-colors focus:border-amber-400/70" />
          </div>
          <button type="button" onClick={() => onChange(Math.min(max, value * 2))}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 font-display text-xs font-black text-white/50 transition-colors hover:border-white/30 hover:text-white">
            2× <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.filter((p) => p <= max).slice(0, 5).map((p) => (
            <button key={p} type="button" onClick={() => onChange(p)}
              className={cn("cursor-pointer rounded-full border px-3.5 py-1.5 font-display text-[11px] font-black uppercase tabular-nums transition-all",
                value === p
                  ? "border-amber-400 bg-amber-400/15 text-amber-300 shadow-[0_0_16px_-4px_rgba(251,191,36,0.6)]"
                  : "border-white/10 bg-white/[0.05] text-white/45 hover:border-white/30 hover:text-white/80")}>
              {p >= 1000000 ? `${(p / 1000000).toFixed(0)}M` : p >= 1000 ? `${(p / 1000).toFixed(0)}K` : p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helper: GameLayout ────────────────────────────────────────────────── */
function GameLayout({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d10]">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-44 left-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-apex-red/10 blur-3xl" />
      <div className="relative p-4 sm:p-7 lg:p-9">
        <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/15 to-transparent ring-1 ring-amber-400/10 sm:size-14">{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/70">Apex Casino</p>
            <h3 className="truncate font-display text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h3>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 sm:inline-flex">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" /> Table open
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  COINFLIP                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
/** Offline toss duration — must match the CSS --toss-ms passed to the stage. */
const OFFLINE_TOSS_MS = 3000;

function CoinflipGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [mode, setMode] = useState<"cash" | "car">("cash");
  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [toss, setToss] = useState<{ key: number; result: "heads" | "tails" } | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [wonCar, setWonCar] = useState<string | null>(null);
  const [lostCar, setLostCar] = useState<string | null>(null);
  const [history, setHistory] = useState<("heads" | "tails")[]>([]);
  // After the 3D wobble settles, swap in a STATIC flat face — the 3D coin's
  // final frame can render edge-on (gold edge instead of the silver tails
  // face). The static face is unmistakable; the payout still happens at
  // touchdown (OFFLINE_TOSS_MS), not when this swap renders.
  const [settled, setSettled] = useState(false);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (flipTimer.current) clearTimeout(flipTimer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const gambleCars = useMemo(() =>
    Object.keys(state.ownedCars).filter((id) => id !== state.activeCarId).map((id) => GAME_CAR_MAP[id]).filter(Boolean),
    [state.ownedCars, state.activeCarId]
  );

  const play = useCallback(() => {
    if (mode === "cash") { if (state.cash < bet) return toast.error("Not enough cash!"); }
    else { if (!selectedCar) return toast.error("Select a car to gamble!"); }
    setSpinning(true); setResult(null); setWon(null); setCarPrize(null); setWonCar(null); setLostCar(null);
    // Decide the flip UPFRONT so the 3D spin's final rotation lands on the
    // true face — the coin honestly shows the result it lands on, and the
    // reveal happens at touchdown, not via a mid-air face swap.
    const r: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
    setSettled(false);
    setToss({ key: Date.now(), result: r });
    sfx.whoosh();
    if (flipTimer.current) clearTimeout(flipTimer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    flipTimer.current = setTimeout(() => {
      sfx.land();
      setResult(r); setHistory((h) => [r, ...h].slice(0, 12)); const wonGame = r === pick;      setWon(wonGame);
      if (wonGame) sfx.win(); else sfx.lose();
      if (mode === "cash") {
        if (wonGame) {
          dispatch({ type: "ADD_CASH", amount: bet });
        } else {
          dispatch({ type: "ADD_CASH", amount: -bet });
        }
      } else {
        // The staked car always changes hands — a win used to KEEP the stake
        // AND grant a prize car (free money on every flip), and when the
        // player already owned the prize, ADD_CAR silently no-oped: the
        // stake vanished with nothing in return.
        dispatch({ type: "REMOVE_CAR", carId: selectedCar! });
        if (wonGame) {
          const betCar = GAME_CAR_MAP[selectedCar!]; const betValue = betCar?.value ?? 0;
          const houseCars = ["ferrari-f8-19", "huracan-15", "911-turbo-s-19", "mclaren-720s-17", "amg-gt-black-18", "ferrari-458-12", "911-gt3-18", "amg-c63-18", "m4-18", "corvette-c6-08"]
            .map((id) => GAME_CAR_MAP[id]).filter((c) => c && Math.abs(c.value - betValue) < betValue * 0.5);
          const prizeCar = houseCars.length > 0 ? houseCars[Math.floor(Math.random() * houseCars.length)] : GAME_CAR_MAP["ferrari-f8-19"]!;
          if (state.ownedCars[prizeCar.id]) {
            // Each car exists only once — pay its crate-scrap value instead.
            const scrap = Math.round(prizeCar.value * 0.2);
            dispatch({ type: "ADD_CASH", amount: scrap });
            setWonCar(`${prizeCar.brand} ${prizeCar.name} — $${scrap.toLocaleString()} cash payout`);
            toast.success(`Already own the ${prizeCar.name} — paid cash instead!`);
          } else {
            dispatch({ type: "ADD_CAR", carId: prizeCar.id }); setWonCar(`${prizeCar.brand} ${prizeCar.name}`);
            toast.success(`WON a ${prizeCar.name}!`);
          }
        } else {
          const lost = GAME_CAR_MAP[selectedCar!]; setLostCar(lost ? `${lost.brand} ${lost.name}` : selectedCar);
        }
      }
      setSpinning(false);
    }, OFFLINE_TOSS_MS);
    // 3D toss arc (3s) + squash/wobble tail (~0.7s) → then the static face.
    settleTimer.current = setTimeout(() => setSettled(true), OFFLINE_TOSS_MS + 700);
  }, [mode, bet, pick, selectedCar, state.cash, state.ownedCars, dispatch]);

  return (
    <GameLayout title="Heads or Tails" icon={<CircleDot className="size-7 text-amber-400" />}>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left: the felt & the toss ── */}
        <div className="relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(255,46,0,0.08),transparent_55%),#08080a] px-4 py-8">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          {/* Recent outcomes rail — the table remembers */}
          <div className="flex min-h-7 flex-wrap items-center justify-center gap-1.5">
            {history.length === 0 ? (
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-white/20">
                No flips yet — the table remembers
              </span>
            ) : (
              <>
                <span className="mr-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Last</span>
                {history.map((h, i) => (
                  <span key={`${i}-${h}`} title={h}
                    className={cn("flex size-6 items-center justify-center rounded-full font-display text-[10px] font-black shadow-sm",
                      h === "heads" ? "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950" : "bg-gradient-to-b from-gray-200 to-gray-400 text-gray-800",
                      i > 5 && "opacity-40")}>
                    {h === "heads" ? "H" : "T"}
                  </span>
                ))}
              </>
            )}
          </div>

        {/* The real 3D two-faced coin — launched into the air, spinning ~9
            turns for 3s, landing (squash + wobble + sheen) on the true face,
            then settling into a static flat face that can't render edge-on. */}
        <div className="toss-stage toss-stage-lg" style={{ "--toss-ms": `${OFFLINE_TOSS_MS}ms` } as React.CSSProperties}>
          {toss && !settled ? (
            <div key={toss.key} className="toss-coin-wrap">
              <div className="toss-coin" style={{ "--spin-end": toss.result === "tails" ? "10890deg" : "10800deg" } as React.CSSProperties}>
                <div className="coin-face coin-heads"><Crown className="size-14 text-amber-900 drop-shadow-lg" /><div className="coin-sheen" /></div>
                <div className="coin-face coin-tails"><Star className="size-14 text-gray-800 drop-shadow-lg" /><div className="coin-sheen" /></div>
                <div className="coin-edge" />
              </div>
            </div>
          ) : toss && settled ? (
            /* Settled: flat 2D face — silver for tails, gold for heads. */
            <div className={cn("absolute left-1/2 top-1/2 flex size-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 transition-transform",
              toss.result === "tails"
                ? "border-gray-400 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600 shadow-lg shadow-gray-400/30"
                : "border-amber-500 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-lg shadow-amber-500/30")}
              style={{ animation: "coin-pop 0.35s ease-out" }}>
              {toss.result === "tails"
                ? <Star className="size-16 fill-gray-700 text-gray-800 drop-shadow-lg" />
                : <Crown className="size-16 text-amber-900 drop-shadow-lg" />}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative size-36">
                <div className="coin-face coin-heads"><Crown className="size-14 text-amber-900 drop-shadow-lg" /></div>
              </div>
            </div>
          )}
        </div>
        <p className={cn("-mt-3 font-display text-xs font-bold uppercase tracking-[0.25em]",
          spinning ? "animate-pulse text-white/40" : result ? "text-white/60" : "text-white/25")}>
          {spinning ? "The coin is in the air…" : result ? `Landed on ${result}!` : "Call it — heads or tails"}
        </p>

        </div>{/* end left column */}

        {/* ── Right: the control desk ── */}
        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6">
          {/* Cash / Car segmented toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/50 p-1">
            {(["cash", "car"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-black uppercase tracking-wider transition-all",
                  mode === m ? "bg-gradient-to-b from-amber-400/20 to-amber-500/10 text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)]" : "text-white/40 hover:text-white/70")}>
                {m === "cash" ? <DollarSign className="size-4" /> : <Car className="size-4" />}
                {m === "cash" ? "Cash" : "Gamble Car"}
              </button>
            ))}
          </div>

          {/* Call it — heads or tails */}
          <div className="grid grid-cols-2 gap-3">
            {(["heads", "tails"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setPick(s)}
                className={cn("group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 px-4 py-5 transition-all active:scale-[0.98]",
                  pick === s
                    ? s === "heads"
                      ? "border-amber-400 bg-amber-400/10 shadow-[0_0_28px_-8px_rgba(251,191,36,0.7)]"
                      : "border-gray-300 bg-gray-300/10 shadow-[0_0_28px_-8px_rgba(209,213,219,0.55)]"
                    : "border-white/15 bg-white/[0.03] hover:border-white/35")}>
                <span className={cn("flex size-14 items-center justify-center rounded-full border-2 transition-colors",
                  s === "heads"
                    ? pick === s ? "border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500" : "border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-600/10"
                    : pick === s ? "border-gray-200 bg-gradient-to-br from-gray-200 to-gray-400" : "border-gray-400/40 bg-gradient-to-br from-gray-400/20 to-gray-500/10")}>
                  {s === "heads"
                    ? <Crown className={cn("size-7", pick === s ? "text-amber-950" : "text-amber-300")} />
                    : <Star className={cn("size-7", pick === s ? "text-gray-800" : "text-gray-300")} />}
                </span>
                <span className={cn("font-display text-sm font-black uppercase tracking-[0.2em]", pick === s ? "text-white" : "text-white/45")}>{s}</span>
                <span className="font-display text-[9px] font-bold uppercase tracking-widest text-white/30">your call</span>
              </button>
            ))}
          </div>

        {mode === "cash" ? <BetInput value={bet} onChange={setBet} max={state.cash} /> : (
          <div className="w-full max-w-lg space-y-3">
            <p className="text-center text-sm font-bold text-white/50">Select a car to gamble:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
              {gambleCars.length === 0 ? <p className="col-span-2 py-4 text-center text-sm text-white/30">No cars to gamble. Buy some first!</p>
              : gambleCars.map((car) => (
                <button key={car.id} type="button" onClick={() => setSelectedCar(car.id)}
                  className={cn("flex items-center gap-3 rounded-xl border-2 p-4 transition-all",
                    selectedCar === car.id ? "border-amber-500 bg-amber-500/15" : "border-white/10 bg-[#0a0a0c] hover:border-white/30")}>
                  <Car className={cn("size-5 shrink-0", selectedCar === car.id ? "text-amber-400" : "text-white/30")} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-white">{car.brand} {car.name}</p>
                    <p className="text-xs text-white/30">${car.value.toLocaleString()}</p>
                  </div>
                  {selectedCar === car.id && <CircleDot className="size-5 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={play} disabled={spinning || (mode === "cash" ? state.cash < bet : !selectedCar)}
          className="relative w-full overflow-hidden rounded-2xl bg-apex-red px-6 py-4 font-display text-lg font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_40px_-12px_rgba(255,46,0,0.75)] transition-all hover:bg-apex-red-bright active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:py-5 sm:text-xl">
          <span className="flex items-center justify-center gap-3">
            {spinning ? <CircleDot className="size-6 animate-spin" /> : <CircleDot className="size-6" />}
            {spinning ? "Flipping..." : mode === "cash" ? `Flip — $${bet.toLocaleString()}` : "Flip for a Car!"}
          </span>
        </button>

        {won !== null && !spinning && (
          <ResultBadge won={won}>
            {mode === "cash" ? `+$${bet.toLocaleString()} — ${result?.toUpperCase()}!`
            : won ? "You got a new car!" : `Your car is gone! ${lostCar}`}
          </ResultBadge>
        )}
        {won !== null && !spinning && (
          <PlayAgainButton
            label={mode === "cash" ? undefined : "Pick Another Car"}
            onClick={() => {
              if (mode === "car") {
                setSelectedCar(null); setWonCar(null); setLostCar(null);
                setToss(null); setResult(null); setWon(null); setSettled(false);
                return;
              }
              play();
            }}
            disabled={mode === "cash" ? state.cash < bet : false}
          />
        )}
        {wonCar && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-4 rounded-2xl border-2 border-green-500/50 bg-green-500/15 px-8 py-6">
            <Trophy className="size-8 text-green-400 shrink-0" />
            <div><p className="text-sm font-bold uppercase tracking-wider text-green-400">You Won a Car!</p>
            <p className="mt-1 font-display text-2xl font-black text-white">{wonCar}</p></div>
          </motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6">
            <Award className="size-8 text-amber-400 shrink-0" />
            <div><p className="text-sm font-bold uppercase tracking-wider text-amber-400">Casino Prize Won!</p>
            <p className="mt-1 font-display text-2xl font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
        </div>{/* end control desk */}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ROULETTE                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
const ROULETTE_NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const GRID_ROWS = [[3,6,9,12,15,18,21,24,27,30,33,36],[2,5,8,11,14,17,20,23,26,29,32,35],[1,4,7,10,13,16,19,22,25,28,31,34]];

type BetType = { kind: "number"; value: number } | { kind: "color"; value: "red" | "black" | "green" } | { kind: "range"; value: "1-18" | "19-36" | "1st" | "2nd" | "3rd" } | { kind: "parity"; value: "even" | "odd" };

function RouletteGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(10000);
  const [currentBet, setCurrentBet] = useState<BetType | null>(null);
  const rouletteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (rouletteTimer.current) clearTimeout(rouletteTimer.current); }, []);
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const [wheelOffset, setWheelOffset] = useState(0);

  const placeBet = (b: BetType) => { if (state.cash < bet) return toast.error("Not enough cash!"); setCurrentBet(b); };

  const spin = useCallback(() => {
    if (!currentBet) return toast.error("Place a bet first!");
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet }); setSpinning(true); setWon(null); setCarPrize(null);
    rouletteTimer.current = setTimeout(() => {
      const num = ROULETTE_NUMS[Math.floor(Math.random() * ROULETTE_NUMS.length)]; setLanding(num);
      const color = num === 0 ? "green" : RED_NUMS.has(num) ? "red" : "black";
      let wonGame = false; let multiplier = 0; const b = currentBet!;
      if (b.kind === "number" && b.value === num) { wonGame = true; multiplier = 36; }
      else if (b.kind === "color" && b.value === color) { wonGame = true; multiplier = color === "green" ? 14 : 2; }
      else if (b.kind === "parity") { if (b.value === "even" && num !== 0 && num % 2 === 0) { wonGame = true; multiplier = 2; } if (b.value === "odd" && num % 2 === 1) { wonGame = true; multiplier = 2; } }
      else if (b.kind === "range") { if (b.value === "1-18" && num >= 1 && num <= 18) { wonGame = true; multiplier = 2; } if (b.value === "19-36" && num >= 19) { wonGame = true; multiplier = 2; } if (b.value === "1st" && num >= 1 && num <= 12) { wonGame = true; multiplier = 3; } if (b.value === "2nd" && num >= 13 && num <= 24) { wonGame = true; multiplier = 3; } if (b.value === "3rd" && num >= 25 && num <= 36) { wonGame = true; multiplier = 3; } }    setWon(wonGame);
    const winAmt = wonGame ? bet * multiplier : 0;
    setWinAmount(winAmt);
    if (wonGame) {
      dispatch({ type: "ADD_CASH", amount: winAmt });
    } setSpinning(false);
    }, 2500);
  }, [bet, currentBet, state.cash, dispatch]);

  const numColor = (n: number) => n === 0 ? "bg-green-600" : RED_NUMS.has(n) ? "bg-red-600" : "bg-gray-800";

  return (
    <GameLayout title="Roulette" icon={<Target className="size-7 text-apex-red" />}>
      <div className="flex flex-col items-center gap-4">
        <BetInput value={bet} onChange={setBet} max={state.cash} />
        <div className="relative w-full overflow-hidden h-20 rounded-xl border border-white/10">
          <motion.div animate={spinning ? { x: [-wheelOffset, -wheelOffset - 2000] } : {}} transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute top-0 left-0 flex gap-1.5">
            {[...ROULETTE_NUMS, ...ROULETTE_NUMS, ...ROULETTE_NUMS].map((n, i) => (
              <div key={i} className={cn("flex size-14 items-center justify-center rounded-full text-sm font-bold text-white", numColor(n))}>{n}</div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-1 -translate-x-1/2 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-amber-300" />
        </div>
        {landing !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={cn("flex size-20 items-center justify-center rounded-full text-2xl font-black text-white border-2", numColor(landing), "border-white shadow-xl")}>{landing}</motion.div>
        )}
        {/* Roulette table: tiles flex to the viewport on phones (fixed
            56px tiles force a 700px+ table — unusable on a phone); desktop
            keeps the fixed size-14 tiles exactly as before. */}
        <div className="w-full max-w-3xl">
          <div className="flex gap-1 mb-1.5 sm:gap-1.5">
            <button type="button" onClick={() => placeBet({ kind: "number", value: 0 })}
              className={cn("flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-bold text-white border-2 transition-all sm:h-14 sm:flex-none sm:size-14 sm:rounded-xl sm:text-base", numColor(0), currentBet?.kind === "number" && currentBet.value === 0 ? "ring-2 ring-amber-400" : "border-white/20")}>0</button>
          </div>
          {GRID_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1.5 sm:gap-1.5">
              {row.map((n) => (
                <button key={n} type="button" onClick={() => placeBet({ kind: "number", value: n })}
                  className={cn("flex h-11 flex-1 items-center justify-center rounded-lg text-xs font-bold text-white border-2 transition-all sm:h-14 sm:flex-none sm:size-14 sm:rounded-xl sm:text-sm", numColor(n), currentBet?.kind === "number" && currentBet.value === n ? "ring-2 ring-amber-400" : "border-white/20 hover:ring-2 hover:ring-white/30")}>{n}</button>
              ))}
              <button type="button" onClick={() => placeBet({ kind: "range", value: ri === 0 ? "3rd" : ri === 1 ? "2nd" : "1st" })}
                className="w-14 h-11 rounded-lg text-[10px] font-bold text-white bg-white/10 border-2 border-white/20 hover:bg-white/20 sm:w-20 sm:h-14 sm:text-xs sm:rounded-xl">2 to 1</button>
            </div>
          ))}
          <div className="flex gap-1 mb-1.5 sm:gap-1.5">
            {[{ l: "1st 12", v: "1st" as const }, { l: "2nd 12", v: "2nd" as const }, { l: "3rd 12", v: "3rd" as const }].map((d) => (
              <button key={d.v} type="button" onClick={() => placeBet({ kind: "range", value: d.v })}
                className="flex-1 h-11 rounded-lg text-xs font-bold text-white bg-white/10 border-2 border-white/20 hover:bg-white/20 sm:h-12 sm:rounded-xl sm:text-sm">{d.l}</button>
            ))}
          </div>
          <div className="flex gap-1 sm:gap-1.5">
            {[{ l: "1-18", b: { kind: "range" as const, value: "1-18" as const } },
              { l: "EVEN", b: { kind: "parity" as const, value: "even" as const } },
              { l: "RED", b: { kind: "color" as const, value: "red" as const }, cls: "bg-red-600 hover:bg-red-700" },
              { l: "BLACK", b: { kind: "color" as const, value: "black" as const }, cls: "bg-gray-800 hover:bg-gray-700" },
              { l: "ODD", b: { kind: "parity" as const, value: "odd" as const } },
              { l: "19-36", b: { kind: "range" as const, value: "19-36" as const } }
            ].map((opt) => (
              <button key={opt.l} type="button" onClick={() => placeBet(opt.b)}
                className={cn("flex-1 h-11 rounded-lg text-[11px] font-bold text-white border-2 border-white/20 transition-all sm:h-12 sm:rounded-xl sm:text-sm",
                  opt.cls ?? "bg-white/10 hover:bg-white/20", JSON.stringify(currentBet) === JSON.stringify(opt.b) && "ring-2 ring-amber-400")}>{opt.l}</button>
            ))}
          </div>
        </div>
        {currentBet && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-6 py-2.5">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70">Bet slip</span>
            <span className="font-display text-sm font-black text-white tabular-nums">${bet.toLocaleString()}</span>
            <span className="text-xs text-white/30">on</span>
            <span className="font-display text-sm font-black uppercase text-amber-300">{String(currentBet.value)}</span>
          </div>
        )}
        <button type="button" onClick={spin} disabled={spinning || !currentBet || state.cash < bet}
          className="w-full max-w-lg rounded-2xl bg-apex-red py-5 font-display text-xl font-black uppercase tracking-[0.15em] text-white shadow-[0_16px_40px_-12px_rgba(255,46,0,0.75)] transition-all hover:bg-apex-red-bright active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
          {spinning ? "Spinning..." : currentBet ? `Spin — $${bet.toLocaleString()}` : "Place a bet first"}
        </button>
        {won !== null && !spinning && <ResultBadge won={won}>{won ? `+$${winAmount.toLocaleString()}!` : `-$${bet.toLocaleString()}!`}</ResultBadge>}
        {won !== null && !spinning && (
          <PlayAgainButton onClick={spin} disabled={state.cash < bet} />
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6">
            <Award className="size-8 text-amber-400 shrink-0" />
            <div><p className="text-sm font-bold uppercase tracking-wider text-amber-400">Casino Prize Won!</p><p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CRASH                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
/** Curve point for a moment of a crash round: x sweeps the panel over
 *  ~15s, y is log-scaled so even a 150× peak fits under the ceiling. */
function crashXY(elapsedMs: number, mult: number): { x: number; y: number } {
  return {
    x: Math.min(96, (elapsedMs / 15_000) * 96),
    y: 96 - (Math.log(mult) / Math.log(200)) * 90,
  };
}

function CrashGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(10000);
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashedAt, setCashedAt] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([{ x: 0, y: 96 }]);
  // 30s lockout after every round — no rapid-fire re-betting.
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);
  const startedAt = useRef(0);
  const crashPoint = useRef(1);
  const lastMult = useRef(1);
  const lastPush = useRef(0);
  // Set inside cashOut so the animation loop can never settle a round as a
  // crash after the player already bailed (race between frame and click).
  const cashedRef = useRef(false);

  const beginCooldown = useCallback(() => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(30);
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const start = useCallback(() => {
    if (cooldown > 0) return;
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    // BRUTAL distribution: P(crash ≥ x) = 0.85/x — a 15% house edge (was 3%).
    // Median ≈ 1.7×, ~16% of rounds bust near-instantly below 1.01× before
    // you can even react, and 2×+ only holds 42% of the time. Moonshots to
    // 150× still exist — you just earn them rarely.
    crashPoint.current = Math.min(150, Math.max(1.0, 0.85 / (1 - Math.random())));
    cashedRef.current = false;
    lastMult.current = 1;
    lastPush.current = 0;
    setPlaying(true); setCrashed(false); setCashedOut(false); setCashedAt(0); setWinAmount(0); setMultiplier(1.0); setPoints([{ x: 0, y: 96 }]);
    startedAt.current = performance.now();

    const tick = () => {
      if (cashedRef.current) return;
      const elapsed = performance.now() - startedAt.current;
      // Exponential growth — e^(0.00018·t): 2× at ~3.8s, 10× at ~12.8s.
      const mult = Math.exp(0.00018 * elapsed);
      if (mult >= crashPoint.current) {
        const final = crashPoint.current;
        setMultiplier(final);
        setCrashed(true);
        setPlaying(false);
        setHistory((h) => [final, ...h].slice(0, 20));
        beginCooldown();
        toast.error(`Crashed at ${final.toFixed(2)}× — bet lost`);
        return;
      }
      lastMult.current = mult;
      setMultiplier(mult);
      if (elapsed - lastPush.current > 60) {
        lastPush.current = elapsed;
        setPoints((p) => [...p, crashXY(elapsed, mult)]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [bet, state.cash, dispatch, cooldown, beginCooldown]);

  const cashOut = useCallback(() => {
    if (!playing || cashedRef.current) return;
    cashedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const at = lastMult.current;
    const win = Math.floor(bet * at);
    dispatch({ type: "ADD_CASH", amount: win });
    setCashedOut(true);
    setCashedAt(at);
    setWinAmount(win);
    setMultiplier(at);
    setPlaying(false);
    setHistory((h) => [at, ...h].slice(0, 20));
    // Crash pays CASH ONLY — no casino car prizes from this game.
    beginCooldown();
    toast.success(`Cashed out at ${at.toFixed(2)}× — +$${win.toLocaleString()}`);
  }, [playing, bet, dispatch, beginCooldown]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    },
    [],
  );

  const curveD = useMemo(
    () => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "),
    [points],
  );
  const tip = points[points.length - 1] ?? { x: 0, y: 96 };

  return (
    <GameLayout title="Crash" icon={<TrendingUp className="size-7 text-green-400" />}>
      {/* Previous crashes strip — green above 2×, red below (like the reference) */}
      {history.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Previous Crashes
          </p>
          <div className="chat-scroll flex gap-1.5 overflow-x-auto pb-1">
            {history.map((m, i) => (
              <span
                key={`${i}-${m}`}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold",
                  m >= 2 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400",
                )}
              >
                ×{m.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar — bet controls, like the reference layout */}
        <div className="w-full shrink-0 space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 lg:w-60">
          <p className="flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
            <DollarSign className="size-3.5 text-emerald-400" /> Stake
          </p>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Enter the amount of money you want to bet
          </label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
              className="min-h-[38px] min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b0b0c] px-2.5 font-mono text-sm font-bold text-white outline-none focus:border-amber-400/70"
            />
            <button
              type="button"
              onClick={() => setBet(Math.max(1, Math.floor(state.cash)))}
              disabled={playing}
              className="min-h-[38px] shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-3 text-[11px] font-bold text-white transition-colors hover:border-amber-400/60 hover:text-amber-300 disabled:opacity-40"
            >
              All-in
            </button>
          </div>
          <button
            type="button"
            onClick={cashOut}
            disabled={!playing}
            className="min-h-[38px] w-full rounded-md border border-white/15 bg-white/[0.06] text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-emerald-500/70 hover:text-emerald-300 disabled:opacity-40"
          >
            Cash Out
          </button>
          <p className="text-[11px] leading-relaxed text-white/35">
            In Crash, you have to Cash Out before the crash. Your bet is
            multiplied by the multiplier, and your bet is lost if you don't
            Cash Out before the crash.
          </p>
        </div>

        {/* Chart panel — the multiplier curve */}
        <div
          className={cn(
            "relative h-64 flex-1 overflow-hidden rounded-lg border transition-colors sm:h-80",
            crashed ? "border-red-500/60" : cashedOut ? "border-green-500/60" : "border-white/15",
          )}
        >
          {/* Grid */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.2" />
            ))}
            {[25, 50, 75].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="rgba(255,255,255,0.07)" strokeWidth="0.2" />
            ))}
          </svg>

          {/* The multiplier */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "font-mono text-6xl font-black tabular-nums transition-colors sm:text-8xl",
                crashed ? "text-red-500" : cashedOut ? "text-green-400" : playing ? "text-white" : "text-white/25",
              )}
            >
              ×{multiplier.toFixed(2)}
            </span>
          </div>

          {/* The curve */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {playing && (
              <polyline
                points={`0,96 ${points.map((p) => `${p.x},${p.y}`).join(" ")} ${tip.x},96`}
                fill={crashed ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.07)"}
                stroke="none"
              />
            )}
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={crashed ? "#ef4444" : cashedOut ? "#4ade80" : "#4ade80"}
              strokeWidth="0.9"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Rocket at the tip */}
            <circle cx={tip.x} cy={tip.y} r="1.4" fill={crashed ? "#ef4444" : "#fbbf24"} />
          </svg>
        </div>
      </div>

      {playing ? (
        <button type="button" onClick={cashOut}
          className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-emerald-500 px-10 py-6 font-display text-xl font-black uppercase tracking-wider text-emerald-950 shadow-[0_0_44px_-8px_rgba(16,185,129,0.9)] transition-all hover:bg-emerald-400 active:scale-[0.98] animate-pulse sm:px-16 sm:text-2xl">
          <TrendingUp className="size-6" />CASH OUT — ${(bet * multiplier).toFixed(0)}
        </button>
      ) : (
        <button type="button" onClick={start} disabled={state.cash < bet || cooldown > 0}
          className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-apex-red px-8 py-5 font-display text-lg font-black uppercase tracking-wider text-white shadow-[0_16px_40px_-12px_rgba(255,46,0,0.75)] transition-all hover:bg-apex-red-bright active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:px-16 sm:text-xl">
          <TrendingUp className="size-6" />
          {cooldown > 0
            ? `Next round in ${cooldown}s`
            : `${crashed || cashedOut ? "Play Again" : "Start"} — $${bet.toLocaleString()}`}
        </button>
      )}
      {cashedOut && <ResultBadge won={true}>Cashed out at {cashedAt.toFixed(2)}× — +${winAmount.toLocaleString()}</ResultBadge>}
      {crashed && !cashedOut && <ResultBadge won={false}>Crashed at {multiplier.toFixed(2)}×</ResultBadge>}
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MINES                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
/** Payout math lives in @/game/casino-math (unit-tested); the old inline
 *  formula was player-favorable — an infinite printer via single-tile
 *  cashouts. */

function MinesGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const ROWS = 5, COLS = 5;
  const [bet, setBet] = useState(10000);
  const [mineCount, setMineCount] = useState(5);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [carPrize, setCarPrize] = useState<string | null>(null);

  const start = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!"); dispatch({ type: "ADD_CASH", amount: -bet });
    const m = new Set<number>(); while (m.size < mineCount) m.add(Math.floor(Math.random() * ROWS * COLS));
    setMines(m); setRevealed(new Set()); setPlaying(true); setGameOver(false); setWon(null); setCurrentMult(1); setCarPrize(null);
  }, [bet, mineCount, state.cash, dispatch]);

  const reveal = useCallback((idx: number) => {
    if (!playing || revealed.has(idx)) return;
    if (mines.has(idx)) { setGameOver(true); setPlaying(false); setWon(-bet); toast.error("BOOM!"); }
    else {
      const nr = new Set(revealed); nr.add(idx); setRevealed(nr);
      const safe = ROWS * COLS - mineCount; const mult = minesMultiplier(nr.size, mineCount, ROWS * COLS); setCurrentMult(mult);
      if (nr.size === safe) {        const win = Math.floor(bet * mult); dispatch({ type: "ADD_CASH", amount: win }); setPlaying(false); setWon(win); setGameOver(true); toast.success(`All clear! +${win.toLocaleString()}`); }
    }
  }, [playing, revealed, mines, bet, mineCount, dispatch]);

  const cashOut = useCallback(() => {
    if (!playing || revealed.size === 0) return;
    const win = Math.floor(bet * currentMult); dispatch({ type: "ADD_CASH", amount: win }); setPlaying(false); setWon(win); setGameOver(true);
  }, [playing, revealed, bet, currentMult, dispatch]);

  return (
    <GameLayout title="Mines" icon={<Crosshair className="size-7 text-white/70" />}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-lg"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
          <span className="mr-1 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <Bomb className="size-3.5 text-red-400" /> Mines
          </span>
          {[3, 5, 7, 10].map((n) => (
            <button key={n} type="button" onClick={() => !playing && setMineCount(n)} disabled={playing}
              className={cn("cursor-pointer rounded-full border px-4 py-1.5 font-display text-xs font-black tabular-nums transition-all disabled:cursor-not-allowed",
                mineCount === n ? "border-apex-red bg-apex-red/20 text-white shadow-[0_0_16px_-6px_rgba(255,46,0,0.8)]" : "border-white/10 bg-white/[0.05] text-white/45 hover:border-white/30 hover:text-white")}>{n}</button>
          ))}
        </div>
        {/* Full-width tiles on phones (72px fixed tiles overflow 375px
            viewports); desktop keeps its fixed size-18 grid. */}
        <div className="grid w-full max-w-md grid-cols-5 gap-2 sm:max-w-none sm:gap-3">
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const isRevealed = revealed.has(i); const isMine = mines.has(i); const isGameOverMine = gameOver && isMine;
            return (
              <button key={i} type="button" onClick={() => reveal(i)} disabled={!playing || isRevealed || gameOver}
                className={cn("flex aspect-square items-center justify-center rounded-xl border-2 text-lg font-bold transition-all active:scale-95 sm:aspect-auto sm:size-18 sm:rounded-2xl sm:text-xl sm:hover:scale-105",
                  isRevealed ? isMine ? "border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_20px_-6px_rgba(239,68,68,0.8)]" : "border-emerald-500/70 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_-8px_rgba(16,185,129,0.8)]"
                  : isGameOverMine ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] sm:hover:border-amber-400/50 sm:hover:from-amber-400/10")}>
                {isRevealed ? (isMine ? <Bomb className="size-5 sm:size-7" /> : <Diamond className="size-5 text-green-400 sm:size-7" />)
                : isGameOverMine ? <Bomb className="size-5 sm:size-7" /> : null}
              </button>
            );
          })}
        </div>
        {playing && revealed.size > 0 && (
          <button type="button" onClick={cashOut}
            className="inline-flex items-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 font-display text-lg font-black uppercase tracking-wider text-white shadow-[0_16px_40px_-12px_rgba(5,150,105,0.8)] transition-all hover:bg-emerald-500 active:scale-[0.98] sm:px-12 sm:text-xl">
            <TrendingUp className="size-5" />CASH OUT — ${Math.floor(bet * currentMult).toLocaleString()} ({currentMult.toFixed(2)}×)
          </button>
        )}
        {!playing && !gameOver && (
          <button type="button" onClick={start} disabled={state.cash < bet}
            className="inline-flex items-center gap-3 rounded-2xl bg-apex-red px-8 py-4 font-display text-lg font-black uppercase tracking-wider text-white shadow-[0_16px_40px_-12px_rgba(255,46,0,0.75)] transition-all hover:bg-apex-red-bright active:scale-[0.98] disabled:opacity-40 disabled:shadow-none sm:px-16 sm:py-5 sm:text-xl">
            <Crosshair className="size-5" />START — ${bet.toLocaleString()}
          </button>
        )}
        {won !== null && gameOver && <ResultBadge won={won > 0}>{won > 0 ? `+$${won.toLocaleString()}!` : `-$${Math.abs(won).toLocaleString()}!`}</ResultBadge>}
        {won !== null && gameOver && (
          <PlayAgainButton onClick={start} disabled={state.cash < bet} />
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6">
            <Award className="size-8 text-amber-400 shrink-0" /><div><p className="text-sm font-bold uppercase tracking-wider text-amber-400">Casino Prize Won!</p><p className="mt-1 font-display text-2xl font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  JACKPOT                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */
function JackpotGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100000);
  const [pool, setPool] = useState<{ type: "cash" | "car"; value: number; label: string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const totalPool = pool.reduce((s, p) => s + p.value, 0);

  const addCash = useCallback(() => {
    const actual = Math.min(bet, state.cash); if (actual <= 0) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -actual }); setPool((p) => [...p, { type: "cash", value: actual, label: `$${actual.toLocaleString()}` }]); toast.success(`Added $${actual.toLocaleString()} to the pool`);
  }, [bet, state.cash, dispatch]);

  const [showCarPicker, setShowCarPicker] = useState(false);
  const addCar = useCallback((carId: string) => {
    const car = GAME_CAR_MAP[carId]; if (!car) return;
    // Never wager the last car — REMOVE_CAR would silently refuse it while
    // the pot still counts it, letting the draw pay a car you kept.
    if (Object.keys(state.ownedCars).length <= 1) return toast.error("Keep at least one car!");
    dispatch({ type: "REMOVE_CAR", carId: car.id });
    setPool((p) => [...p, { type: "car", value: car.value, label: `${car.brand} ${car.name}` }]); toast.success(`Added ${car.brand} ${car.name} ($${car.value.toLocaleString()}) to pool`); setShowCarPicker(false);
  }, [state.ownedCars, dispatch]);

  const gambleCars = useMemo(() => Object.keys(state.ownedCars).filter((id) => id !== state.activeCarId).map((id) => GAME_CAR_MAP[id]).filter(Boolean), [state.ownedCars, state.activeCarId]);

  const drawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (drawTimer.current) clearTimeout(drawTimer.current); }, []);
  const draw = useCallback(() => {
    if (pool.length === 0) return toast.error("Pool is empty!"); setSpinning(true); setWinner(null); setCarPrize(null);
    // Wagered cars stay gone when the house wins: they were removed from
    // the garage at add time, but the losing branch used to re-add every
    // wagered car for free — a pot/garage desync that made car entries
    // risk-free (60% of draws refunded the full car stake).
    drawTimer.current = setTimeout(() => { const playerWins = Math.random() < 0.4; if (playerWins) { dispatch({ type: "ADD_CASH", amount: totalPool }); const hasCars = pool.some((e) => e.type === "car"); if (hasCars) { const cp = checkCasinoPrize(dispatch); if (cp) { setCarPrize(cp); } } setWinner("YOU WON THE JACKPOT!"); } else { setWinner("House wins the jackpot"); } setPool([]); setSpinning(false); }, 3000);
  }, [pool, totalPool, dispatch]);

  return (
    <GameLayout title="Jackpot" icon={<Zap className="size-7 text-amber-400" />}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-500/[0.12] to-amber-500/[0.03] p-8 shadow-[0_0_60px_-20px_rgba(251,191,36,0.5)]">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative mb-6 text-center">
            <p className="flex items-center justify-center gap-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-amber-400/70"><Zap className="size-3.5" /> Prize Pool</p>
            <p className="mt-2 font-display text-5xl font-black tabular-nums tracking-tight text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.45)] sm:text-6xl">${totalPool.toLocaleString()}</p>
            <p className="mt-1.5 text-xs text-white/35 tabular-nums">{pool.length} {pool.length === 1 ? "entry" : "entries"} in the pool</p>
          </div>
          {pool.length > 0 && <div className="relative max-h-40 space-y-2 overflow-y-auto pr-1">{pool.map((p, i) => <CarChip key={i} label={p.label} value={p.value} type={p.type} />)}</div>}
        </div>
        {spinning && (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
            className="flex items-center justify-center size-16 rounded-full bg-amber-500/20 border-2 border-amber-500">
            <Zap className="size-8 text-amber-400" />
          </motion.div>
        )}
        <div className="w-full max-w-lg"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={addCash} disabled={spinning || state.cash < bet}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-7 py-3.5 font-display text-sm font-black uppercase tracking-wider text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <DollarSign className="size-4" />Add Cash
          </button>
          <button type="button" onClick={() => setShowCarPicker(!showCarPicker)} disabled={spinning || gambleCars.length === 0}
            className={cn("inline-flex cursor-pointer items-center gap-2 rounded-full border px-7 py-3.5 font-display text-sm font-black uppercase tracking-wider transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
              showCarPicker ? "border-purple-400 bg-purple-500/25 text-purple-200" : "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20")}>
            <Car className="size-4" />Gamble Car {gambleCars.length > 0 && <span className="ml-1 text-xs opacity-60 tabular-nums">({gambleCars.length})</span>}
          </button>
          <button type="button" onClick={draw} disabled={spinning || pool.length === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-apex-red px-9 py-3.5 font-display text-sm font-black uppercase tracking-wider text-white shadow-[0_14px_34px_-12px_rgba(255,46,0,0.8)] transition-all hover:bg-apex-red-bright active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
            <Zap className="size-4" />Draw Winner
          </button>
        </div>
        {showCarPicker && (
          <div className="w-full max-w-lg rounded-2xl border-2 border-purple-500/30 bg-[#0a0a0c] p-4">
            <p className="mb-3 text-sm font-bold text-purple-400">Select a car to add to the pool:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
              {gambleCars.map((car) => (
                <button key={car.id} type="button" onClick={() => addCar(car.id)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111114] p-3 text-left transition-all hover:border-purple-500/50 hover:bg-purple-500/10">
                  <Car className="size-4 shrink-0 text-white/30" />
                  <div className="flex-1 min-w-0"><p className="truncate text-sm font-bold text-white">{car.brand} {car.name}</p><p className="text-xs text-white/30">${car.value.toLocaleString()}</p></div>
                  <Zap className="size-4 text-purple-400" />
                </button>
              ))}
            </div>
          </div>
        )}
        {winner && <ResultBadge won={winner.includes("YOU")}>{winner}</ResultBadge>}
        {winner && !spinning && (
          <PlayAgainButton
            onClick={() => { setWinner(null); setCarPrize(null); addCash(); }}
            disabled={state.cash < bet}
          />
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4">
            <Award className="size-6 text-amber-400 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-amber-400">Casino Prize Won!</p><p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE COINFLIP 1v1                                                      */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineCoinflip({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<{ myPick: string; oppPick: string; won: boolean } | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const matchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (matchTimer.current) clearTimeout(matchTimer.current); }, []);

  const findMatch = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!"); setFinding(true); setResult(null); setCarPrize(null);
    matchTimer.current = setTimeout(() => {
      const coinFlipResult = Math.random() < 0.5 ? "heads" : "tails"; const won = coinFlipResult === pick; if (won) { dispatch({ type: "ADD_CASH", amount: bet }); } else { dispatch({ type: "ADD_CASH", amount: -bet }); }
      setResult({ myPick: pick, oppPick: coinFlipResult, won }); setFinding(false);
      // Car prizes only available when gambling cars, not cash
      toast[won ? "success" : "error"](won ? `Won $${bet.toLocaleString()}!` : `Lost $${bet.toLocaleString()}`);
    }, 2500);
  }, [bet, pick, state.cash, dispatch]);

  return (
    <GameLayout title="Online Coinflip 1v1" icon={<Swords className="size-7 text-blue-400" />}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-3">
          {(["heads", "tails"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPick(s)}
              className={cn("inline-flex items-center gap-2 rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
                pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50")}>
              <Crown className="size-5" />{s}
            </button>
          ))}
        </div>
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <button type="button" onClick={findMatch} disabled={finding || state.cash < bet}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-40">
          {finding ? <CircleDot className="size-4 animate-spin" /> : <Swords className="size-4" />}
          {finding ? "Finding opponent..." : "Find Match"}
        </button>
        {result && (
          <div className="flex gap-6">
            <div className="text-center"><p className="text-xs text-white/30 mb-1">You</p><CoinIcon side={result.myPick as "heads" | "tails"} size="lg" /></div>
            <div className="flex items-center text-2xl font-bold text-white/30">vs</div>
            <div className="text-center"><p className="text-xs text-white/30 mb-1">Opponent</p><CoinIcon side={result.oppPick as "heads" | "tails"} size="lg" /></div>
          </div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4">
            <Award className="size-6 text-amber-400 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-amber-400">Casino Prize!</p><p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE JACKPOT                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineJackpot({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100000);
  const [players, setPlayers] = useState<{ name: string; amount: number }[]>([]);
  const [round, setRound] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (roundTimer.current) clearTimeout(roundTimer.current); }, []);

  const join = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!"); dispatch({ type: "ADD_CASH", amount: -bet });
    const names = ["PHANTOM", "BLITZ", "VORTEX", "STORM", "NITRO", "APEX", "DRIFT", "HEX"];
    const opps = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => ({ name: names[Math.floor(Math.random() * names.length)], amount: Math.floor(Math.random() * 1000000) + 10000 }));
    setPlayers([...opps, { name: "YOU", amount: bet }]); setRound(true); setWinner(null);
    roundTimer.current = setTimeout(() => { const all = [...opps, { name: "YOU", amount: bet }]; const total = all.reduce((s, p) => s + p.amount, 0);
      // Winner drawn weighted by contribution (see pickWeighted) — the old
      // uniform pick over players was a massive positive-EV printer.
      const w = pickWeighted(all); if (w && w.name === "YOU") { dispatch({ type: "ADD_CASH", amount: total }); toast.success(`JACKPOT! Won ${total.toLocaleString()}!`); }
      else if (w) { toast.error(`${w.name} won ${total.toLocaleString()}`); } setWinner(w ? w.name : null); setRound(false); }, 4000);
  }, [bet, state.cash, dispatch]);

  return (
    <GameLayout title="Online Jackpot" icon={<Star className="size-7 text-purple-400" />}>
      <div className="flex flex-col items-center gap-6">
        {round ? (
          <>
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/40">Players in pool</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p, i) => (
                <div key={`${p.name}-${i}`} className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tabular-nums",
                  p.name === "YOU" ? "border-amber-400/60 bg-amber-400/15 text-amber-300 shadow-[0_0_20px_-8px_rgba(251,191,36,0.7)]" : "border-white/12 bg-white/[0.05] text-white/55")}>
                  {p.name === "YOU" ? <Crown className="size-3" /> : <Circle className="size-3 text-white/30" />}{p.name} — ${p.amount.toLocaleString()}
                </div>
              ))}
            </div>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
              className="flex items-center justify-center size-12 rounded-full bg-amber-500/20 border border-amber-500/50">
              <Zap className="size-6 text-amber-400" />
            </motion.div>
          </>
        ) : (
          <>
            <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
            <button type="button" onClick={join} disabled={state.cash < bet}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-purple-600 px-10 py-4 font-display text-base font-black uppercase tracking-wider text-white shadow-[0_14px_34px_-12px_rgba(147,51,234,0.8)] transition-all hover:bg-purple-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              <Star className="size-4" />Join Jackpot
            </button>
          </>
        )}
        {winner && <ResultBadge won={winner === "YOU"}>{winner === "YOU" ? "You Won the Jackpot!" : `${winner} won!`}</ResultBadge>}
        {winner && !round && (
          <PlayAgainButton onClick={join} disabled={state.cash < bet} />
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4">
            <Award className="size-6 text-amber-400 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-amber-400">Casino Prize Won!</p><p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p></div>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}
