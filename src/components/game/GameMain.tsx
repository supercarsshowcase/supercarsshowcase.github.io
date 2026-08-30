import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Car as CarIcon,
  CircleDollarSign,
  Clock,
  Coins,
  Dice5,
  Flame,
  Gift,
  MousePointerClick,
  Package,
  Save,
  Shield,
  Sparkles,
  Star,
  Store,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Wrench,
  BarChart3,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import {
  GAME_CAR_MAP,
  RARITY_META,
  STARTER_ID,
  fmtMoney,
  gameCarImage,
  levelFrom,
} from "@/game/data";
import {
  carPower,
  carValue,
  clickValue,
  critChance,
  dailyReward,
  passivePerSec,
  type Action,
} from "@/game/engine";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GamePanels } from "./GamePanels";
import { GiftModal } from "./GiftModal";

const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "earn", label: "Earn", icon: MousePointerClick },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "spin", label: "Spin", icon: CircleDollarSign },
  { id: "garage", label: "Garage", icon: CarIcon },
  { id: "dealer", label: "Dealers", icon: Store },
  { id: "crates", label: "Crates", icon: Package },
  { id: "upgrades", label: "Upgrades", icon: Wrench },
  { id: "inventory", label: "Parts", icon: Boxes },
  { id: "casino", label: "Casino", icon: Dice5 },
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3 },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "prestige", label: "Prestige", icon: Sparkles },
  { id: "gift", label: "Gift", icon: Gift },
];

type TabId =
  | "earn"
  | "challenges"
  | "spin"
  | "garage"
  | "dealer"
  | "crates"
  | "upgrades"
  | "inventory"
  | "casino"
  | "leaderboard"
  | "achievements"
  | "prestige"
  | "gift";

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
}

function CountdownTimer({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-white/30">Expired</span>;

  const totalSec = Math.ceil(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return (
    <span className="font-mono text-apex-red tabular-nums">{parts.join(" ")}</span>
  );
}

/** Minimum ms between clicks. Below this, clicks are silently dropped. */
const CLICK_COOLDOWN_MS = 40;
/** If 8+ clicks land within 1 second, block for this long (ms). */
const BURST_PENALTY_MS = 2000;
const BURST_THRESHOLD = 8;
const BURST_WINDOW_MS = 1000;

export function GameMain({
  state,
  dispatch,
  globalMultiplier = 1,
  activeEvent,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  globalMultiplier?: number;
  activeEvent?: { multiplier: number; label: string; expiresAt: number } | null;
}) {
  const [tab, setTab] = useState<TabId>("earn");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupId = useRef(0);

  // ── Anti-autoclicker state ──
  const lastClickAt = useRef(0);
  const clickTimestamps = useRef<number[]>([]);
  const [clickLocked, setClickLocked] = useState(false);
  const [clickBlocked, setClickBlocked] = useState(false);

  const active = GAME_CAR_MAP[state.activeCarId] ?? GAME_CAR_MAP[STARTER_ID];
  const level = levelFrom(state);
  const cash = state.cash;
  const income = Math.round(passivePerSec(state) * globalMultiplier);
  const perClick = Math.round(clickValue(state) * globalMultiplier);
  const rarityMeta = RARITY_META[active.rarity];
  const condition = (state.ownedCars[state.activeCarId]?.upgrades.condition ?? 0) / 6;
  const now = state.lastTick;
  const daily = dailyReward(state, now);
  const canClaim = now >= state.daily.nextClaimAt;
  const waitMin = canClaim ? 0 : Math.max(1, Math.ceil((state.daily.nextClaimAt - now) / 60000));
  const waitLabel = waitMin >= 60 ? `${Math.floor(waitMin / 60)}h ${waitMin % 60}m` : `${waitMin}m`;
  const levelBase = Math.max(1, level - state.prestigeLevel * 10);
  const xpForLevel = (Math.pow(levelBase, 2) - Math.pow(levelBase - 1, 2)) * 500;
  const xpIntoLevel = Math.max(0, state.totalEarned - Math.pow(levelBase - 1, 2) * 500);
  const xpPct = Math.min(100, (xpIntoLevel / Math.max(1, xpForLevel)) * 100);
  const nextLevelEarned = Math.pow(levelBase, 2) * 500;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();

    // 1. Minimum cooldown between clicks — blocks simple autoclickers
    if (now - lastClickAt.current < CLICK_COOLDOWN_MS) return;
    lastClickAt.current = now;

    // 2. Burst detection — if too many clicks in a short window, lock out
    clickTimestamps.current.push(now);
    // Prune old timestamps outside the window
    clickTimestamps.current = clickTimestamps.current.filter((t) => now - t < BURST_WINDOW_MS);
    if (clickTimestamps.current.length >= BURST_THRESHOLD) {
      clickTimestamps.current = [];
      setClickBlocked(true);
      setClickLocked(true);
      toast.error("Too fast! Auto-clicking detected. Clicking paused.", {
        duration: BURST_PENALTY_MS,
        style: { background: "#1a0404", border: "1px solid rgba(255,0,0,0.4)", color: "#fff" },
      });
      setTimeout(() => {
        setClickBlocked(false);
        setClickLocked(false);
        clickTimestamps.current = [];
      }, BURST_PENALTY_MS);
      return;
    }

    const crit = Math.random() < critChance(state);
    const amount = Math.round(perClick * (crit ? 5 : 1));
    dispatch({ type: "CLICK", amount, globalMultiplier });
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++popupId.current;
    const popup: Popup = {
      id,
      x: e.clientX - rect.left + (Math.random() * 40 - 20),
      y: e.clientY - rect.top - 10,
      text: crit ? `CRITICAL +${fmtMoney(amount)}` : `+${fmtMoney(amount)}`,
      crit,
    };
    setPopups((p) => [...p.slice(-24), popup]);
    window.setTimeout(() => {
      setPopups((p) => p.filter((x) => x.id !== id));
    }, 900);
  };

  const claimDaily = () => {
    if (!canClaim) {
      toast.error(`Daily unlocks in ${waitLabel}`);
      return;
    }
    dispatch({ type: "CLAIM_DAILY", reward: daily, now });
    toast.success(`Daily reward claimed: ${fmtMoney(daily)}`);
  };

  const saveNow = () => {
    localStorage.setItem("supercars.game.v1", JSON.stringify(state));
    toast.success("Game saved");
  };

  const resetNow = () => {
    if (window.confirm("Hard reset erases ALL game progress. Continue?")) {
      dispatch({ type: "HARD_RESET" });
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden px-2 py-2 sm:px-4 lg:px-5">
      {/* ── Active Event Banner ── */}
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 overflow-hidden rounded-xl border border-apex-red/50 bg-gradient-to-r from-apex-red/20 via-orange-600/20 to-apex-red/20 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-apex-red/30 animate-pulse">
                <Flame className="size-5 text-apex-red" />
              </span>
              <div>
                <p className="font-display text-sm font-black uppercase tracking-wider text-apex-red">
                  {activeEvent.label}
                </p>
                <p className="text-[11px] text-white/50">
                  All earnings multiplied · Expires in <CountdownTimer expiresAt={activeEvent.expiresAt} />
                </p>
              </div>
            </div>
            <span className="font-display text-2xl font-black text-apex-red">
              {activeEvent.multiplier}x
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Header ── */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            <span className="inline-block size-1.5 rounded-full bg-apex-red" />
            The Garage Tycoon
          </p>
          <h1 className="mt-0.5 font-display text-xl font-black tracking-tight text-white sm:text-2xl">
            GAME
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatPill icon={Coins} label="Cash" value={fmtMoney(cash)} accent />
          <StatPill icon={TrendingUp} label="Income/s" value={fmtMoney(income)} />
          <StatPill icon={Star} label="Level" value={String(level)} />
          <StatPill icon={Shield} label="Rep" value={String(Math.round(state.reputation).toLocaleString())} />
          <StatPill icon={CarIcon} label="Cars" value={String(Object.keys(state.ownedCars).length)} />
        </div>
      </div>

      {/* ── Gift Modal ── */}
      <GiftModal
        open={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        currentCash={cash}
      />

      {/* ── Mobile action row ── */}
      <div className="mb-2 flex flex-wrap items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={claimDaily}
          disabled={!canClaim}
          className="inline-flex items-center gap-2 rounded-md border border-apex-red/40 bg-apex-red/10 px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
        >
          <Gift className="size-4 text-apex-red" />
          {canClaim ? `Daily ${fmtMoney(daily)}` : `Daily in ${waitLabel}`}
          {state.daily.streak > 1 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">×{state.daily.streak}</span>
          )}
        </button>
        <button
          type="button"
          onClick={saveNow}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
        >
          <Save className="size-4" /> Save
        </button>
        <button
          type="button"
          onClick={resetNow}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red"
        >
          <Trash2 className="size-4" /> Reset
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {/* ── Left sidebar (desktop) ── */}
        <aside className="hidden w-[21rem] shrink-0 flex-col gap-2 lg:flex">
          {/* Balance */}
          <div className="rounded-xl border border-apex-line bg-apex-panel px-3 py-2">
            <p className="text-[7px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Cash
            </p>
            <p className="mt-0.5 font-display text-lg font-black tracking-tight text-white">
              {fmtMoney(cash)}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1 border-t border-apex-line pt-1 text-center">
              <div>
                <p className="font-display text-xs font-black text-apex-red">{fmtMoney(income)}</p>
                <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  /sec
                </p>
              </div>
              <div>
                <p className="font-display text-xs font-black text-white">{fmtMoney(perClick)}</p>
                <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  click
                </p>
              </div>
            </div>
          </div>

          {/* Level / XP */}
          <div className="rounded-xl border border-apex-line bg-apex-panel px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                Level {level}
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Prestige {state.prestigeLevel}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-apex-red"
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {fmtMoney(xpIntoLevel)} / {fmtMoney(xpForLevel)} xp
            </p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-px rounded-xl border border-apex-line bg-apex-panel p-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "gift") {
                      setShowGiftModal(true);
                    } else {
                      setTab(item.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.14em] transition-colors",
                    isActive
                      ? "border-l-2 border-apex-red bg-apex-red/10 text-white"
                      : "border-l-2 border-transparent text-white/45 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-3.5", isActive ? "text-apex-red" : "text-white/40")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Daily + save/reset */}
          <div className="mt-auto rounded-xl border border-apex-line bg-apex-panel px-2.5 py-2">
            <button
              type="button"
              onClick={claimDaily}
              disabled={!canClaim}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
                canClaim
                  ? "bg-apex-red text-white hover:bg-apex-red/80"
                  : "cursor-not-allowed border border-white/10 bg-white/5 text-white/40",
              )}
            >
              <Gift className={cn("size-3.5", canClaim ? "text-white" : "text-white/40")} />
              {canClaim ? `Daily ${fmtMoney(daily)}` : `Daily in ${waitLabel}`}
              {state.daily.streak > 1 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">×{state.daily.streak}</span>
              )}
            </button>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={saveNow}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
              >
                <Save className="size-3" /> Save
              </button>
              <button
                type="button"
                onClick={resetNow}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red"
              >
                <Trash2 className="size-3" /> Reset
              </button>
            </div>
            <p className="mt-2 text-center text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Garage Tycoon · v1
            </p>
          </div>
        </aside>

        {/* ── Main area ── */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {tab === "earn" ? (
            <EarnZone
              state={state}
              active={active}
              rarityMeta={rarityMeta}
              condition={condition}
              perClick={perClick}
              income={income}
              popups={popups}
              onCarClick={handleClick}
              clickBlocked={clickBlocked}
            />
          ) : tab === "challenges" ? (
            <WeeklyChallenges state={state} dispatch={dispatch} />
          ) : (
            <div>
              <GamePanels tab={tab} state={state} dispatch={dispatch} />
            </div>
          )}

          {/* Mobile nav */}
          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-apex-line pb-px lg:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "gift") {
                      setShowGiftModal(true);
                    } else {
                      setTab(item.id);
                    }
                  }}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                    isActive ? "text-white" : "text-white/45 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-3.5", isActive ? "text-apex-red" : "text-white/40")} />
                  {item.label}
                  {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-apex-red" />}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

function EarnZone({
  state,
  active,
  rarityMeta,
  condition,
  perClick,
  income,
  popups,
  onCarClick,
  clickBlocked,
}: {
  state: GameState;
  active: NonNullable<typeof GAME_CAR_MAP[string]>;
  rarityMeta: { label: string; color: string; glow: string };
  condition: number;
  perClick: number;
  income: number;
  popups: Popup[];
  onCarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  clickBlocked: boolean;
}) {
  const totalEarned = state.totalEarned;
  const totalClicks = state.totalClicks ?? 0;
  const critChance = Math.min(0.15 + (state.prestigeLevel * 0.01), 0.30);
  const ownedCount = Object.keys(state.ownedCars).length;
  const upgradeCount = Object.values(state.ownedCars).reduce(
    (sum: number, c: any) => sum + Object.values(c?.upgrades ?? {}).reduce((s: number, v: any) => s + (v as number), 0),
    0,
  );
  const daily = dailyReward(state, state.lastTick);
  const streak = state.daily.streak;

  return (
    <div className="relative">
      {/* ── Earn header with stats row ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Earn
          </p>
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">
            Tap the car to earn cash
          </span>
        </div>
        {/* Quick stats strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <EarnStat value={fmtMoney(perClick)} label="Per click" accent />
          <EarnStat value={fmtMoney(income)} label="Per second" />
          <EarnStat value={fmtMoney(carValue(state, state.activeCarId))} label="Car value" />
          <EarnStat value={carPower(state, state.activeCarId).toLocaleString()} label="Horsepower" />
          <EarnStat value={fmtMoney(totalEarned)} label="Total earned" />
          <EarnStat value={totalClicks.toLocaleString()} label="Total clicks" />
        </div>
      </div>

      {/* ── Detailed info strip ── */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-apex-line bg-apex-panel px-3 py-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Daily Reward</p>
          <p className="mt-0.5 font-display text-sm font-black text-apex-red">{fmtMoney(daily)}</p>
          {streak > 1 && <p className="text-[9px] text-white/40">Streak: {streak}×</p>}
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-3 py-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Crit Chance</p>
          <p className="mt-0.5 font-display text-sm font-black text-amber-400">{Math.round(critChance * 100)}%</p>
          <p className="text-[9px] text-white/40">5× multiplier</p>
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-3 py-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Garage</p>
          <p className="mt-0.5 font-display text-sm font-black text-white">{ownedCount} cars</p>
          <p className="text-[9px] text-white/40">{upgradeCount} upgrades</p>
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-3 py-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Reputation</p>
          <p className="mt-0.5 font-display text-sm font-black text-emerald-400">{Math.round(state.reputation).toLocaleString()}</p>
          <p className="text-[9px] text-white/40">Prestige {state.prestigeLevel}</p>
        </div>
      </div>

      {/* ── Car click zone ── */}
      <div
        onClick={onCarClick}
        className={cn(
          "group relative cursor-pointer select-none overflow-hidden rounded-2xl border bg-[#0b0b0c] transition-all",
          clickBlocked
            ? "border-red-500/30"
            : "border-apex-line hover:border-apex-red/30",
        )}
      >
        {/* Corner brackets */}
        <span className="pointer-events-none absolute left-3 top-3 z-10 size-4 border-l-2 border-t-2 border-apex-red/50" />
        <span className="pointer-events-none absolute right-3 top-3 z-10 size-4 border-r-2 border-t-2 border-apex-red/50" />
        <span className="pointer-events-none absolute bottom-3 left-3 z-10 size-4 border-b-2 border-l-2 border-apex-red/50" />
        <span className="pointer-events-none absolute bottom-3 right-3 z-10 size-4 border-b-2 border-r-2 border-apex-red/50" />

        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: clickBlocked
              ? `radial-gradient(80% 90% at 50% 40%, rgba(127,29,29,0.15) 0%, transparent 60%), #050505`
              : `radial-gradient(80% 90% at 50% 40%, ${rarityMeta.glow} 0%, transparent 60%), #050505`,
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-4 sm:p-6">
          {/* Car badge + name */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{
                borderColor: rarityMeta.color,
                color: rarityMeta.color,
                background: `${rarityMeta.color}14`,
              }}
            >
              {rarityMeta.label}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {active.brand} · {active.year}
            </span>
          </div>
          <h2 className="font-display text-4xl font-black tracking-tight text-white sm:text-6xl">
            {active.name}
          </h2>

          {/* Car image */}
          <motion.div whileTap={{ scale: clickBlocked ? 1 : 0.97 }} className="relative mt-4 w-full max-w-5xl">
            <SmartImage
              src={gameCarImage(active)}
              alt={active.name}
              className={cn(
                "mx-auto w-full max-h-[360px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-300",
                clickBlocked ? "opacity-50 grayscale" : "",
              )}
            />
            <div
              className="pointer-events-none absolute inset-x-10 bottom-2 h-8 rounded-[100%] opacity-60 blur-xl"
              style={{ background: rarityMeta.glow }}
            />
          </motion.div>

          {/* Condition bar + car specs row */}
          <div className="mt-4 w-full max-w-xl space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span>Condition</span>
                <span>{Math.round(condition * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-apex-red"
                  animate={{ width: `${condition * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
            {/* Quick specs */}
            <div className="flex items-center justify-center gap-4 text-[9px] uppercase tracking-[0.14em] text-white/40">
              <span className="flex items-center gap-1"><Zap className="size-3 text-apex-red" /> {carPower(state, state.activeCarId).toLocaleString()} hp</span>
              <span className="flex items-center gap-1"><TrendingUp className="size-3 text-emerald-400" /> {fmtMoney(perClick)}/click</span>
              <span className="flex items-center gap-1"><Coins className="size-3 text-amber-400" /> {fmtMoney(income)}/sec</span>
            </div>
          </div>

          {/* Click prompt */}
          {clickBlocked ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-6 py-2.5">
              <Shield className="size-4 text-red-400" />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">
                Clicking paused — too fast
              </span>
            </div>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-apex-red/40 bg-apex-red/10 px-6 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors group-hover:bg-apex-red">
              <MousePointerClick className="size-4" />
              Click the car to earn
            </p>
          )}
        </div>

        {/* Floating popups */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {popups.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -70, scale: 1.15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className={cn(
                  "absolute font-display text-xl font-black",
                  p.crit ? "text-amber-300" : "text-apex-red",
                )}
                style={{ left: p.x, top: p.y, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
              >
                {p.text}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function EarnStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-apex-panel px-2 py-3 text-center">
      <p className={cn("font-display text-lg font-black", accent ? "text-apex-red" : "text-white")}>
        {value}
      </p>
      <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-apex-line bg-apex-panel px-2 py-1">
      <Icon className={cn("size-3", accent ? "text-apex-red" : "text-white/40")} />
      <span className="font-display text-[8px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <span className="font-display text-xs font-black text-white">{value}</span>
    </div>
  );
}

function WeeklyChallenges({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const weekly = state.weekly;
  const now = Date.now();
  // Calculate remaining time until next Monday
  const nextMonday = new Date();
  const day = nextMonday.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const msLeft = Math.max(0, nextMonday.getTime() - now);
  const daysLeft = Math.floor(msLeft / 86_400_000);
  const hoursLeft = Math.floor((msLeft % 86_400_000) / 3_600_000);
  const timeLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`;

  // Ensure weekly state is current
  const currentMonday = new Date(now);
  const d = currentMonday.getDay();
  currentMonday.setDate(currentMonday.getDate() - d + (d === 0 ? -6 : 1));
  currentMonday.setHours(0, 0, 0, 0);
  const currentMondayStr = currentMonday.toISOString().split("T")[0];
  useEffect(() => {
    if (weekly.weekStart !== currentMondayStr) {
      dispatch({ type: "WEEKLY_CHECK", now });
    }
  }, [weekly.weekStart, currentMondayStr, now, dispatch]);

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[9px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              Weekly Challenges
            </p>
            <h3 className="mt-0.5 font-display text-lg font-black tracking-tight text-white">
              CHALLENGES
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-300/5 px-2.5 py-1">
            <Clock className="size-3 text-amber-300" />
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300">
              Resets in {timeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {weekly.challenges.map((ch) => {
          const pct = Math.min(100, (ch.progress / ch.target) * 100);
          const complete = ch.progress >= ch.target;
          return (
            <div
              key={ch.id}
              className={cn(
                "rounded-xl border bg-apex-panel px-3 py-2.5 transition-colors",
                ch.claimed
                  ? "border-green-500/30"
                  : complete
                    ? "border-amber-400/40"
                    : "border-apex-line",
              )}
            >
              <div className="mb-1.5 flex items-start justify-between">
                <div>
                  <h4 className="font-display text-xs font-black text-white">
                    {ch.name}
                  </h4>
                  <p className="mt-0.5 text-[9px] text-white/40">
                    {ch.desc}
                  </p>
                </div>
                {ch.claimed && (
                  <span className="rounded-sm bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-400">
                    Claimed
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-1.5">
                <div className="mb-1 flex items-center justify-between text-[9px]">
                  <span className="text-white/40">
                    {fmtMoney(ch.progress)} / {fmtMoney(ch.target)}
                  </span>
                  <span className="font-bold text-white/60">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      ch.claimed ? "bg-green-500" : complete ? "bg-amber-400" : "bg-apex-red",
                    )}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Reward + claim */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="text-white/40">
                    Reward: <span className="font-bold text-apex-red">{fmtMoney(ch.rewardCash)}</span> cash
                  </span>
                  <span className="text-white/40">
                    + <span className="font-bold text-emerald-400">{ch.rewardRep.toLocaleString()}</span> rep
                  </span>
                </div>
                {!ch.claimed && complete && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "CLAIM_WEEKLY", challengeId: ch.id })}
                    className="rounded-md bg-amber-400 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-amber-300"
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
