import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Home,
  Menu,
  MessageCircle,
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
import { Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SmartImage } from "@/components/SmartImage";
import { useAuth } from "@/hooks/use-auth";
import {
  GAME_CAR_MAP,
  RARITY_META,
  STARTER_ID,
  fmtMoney,
  fmtNum,
  gameCarImage,
  levelFrom,
} from "@/game/data";
import {
  carPower,
  carValue,
  clickValue,
  critChance,
  dailyReward,
  fuelCost,
  FUEL_MAX,
  passivePerSec,
  type Action,
} from "@/game/engine";
import {
  gameEventBannerRem,
  gameZoom,
  SITE_HEADER_REM,
  SITE_ZOOM,
  vpFill,
  vpRail,
} from "@/game/fit";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BadgeCheck,
  Crown,
  Send,
  X,
} from "lucide-react";
import { GamePanels } from "./GamePanels";
import { GiftModal } from "./GiftModal";
import { ChatPanel } from "./ChatPanel";

const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "earn", label: "Earn", icon: MousePointerClick },
  { id: "wanted", label: "Wanted", icon: Shield },
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

/** Tabs promoted to the mobile bottom bar; everything else lives in "More".
 *  Desktop ignores this — it renders the full sidebar nav. */
const PRIMARY_TABS: TabId[] = ["earn", "spin", "casino", "garage"];

type TabId =
  | "earn"
  | "wanted"
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

/** The game runs fullscreen — the site header is hidden on /game.
 *  Zoom constants (design width, caps, mobile boost) live in @/game/fit. */

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
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Anti-autoclicker state ──
  const lastClickAt = useRef(0);
  const clickTimestamps = useRef<number[]>([]);
  const [clickBlocked, setClickBlocked] = useState(false);
  // The block is also readable synchronously inside handleClick — state can
  // lag a frame, which let a few extra (unpaid but state-spinning) clicks
  // slip through during the lockout window.
  const clickBlockedRef = useRef(false);
  // The burst-penalty unlock timer must be cancelled on unmount — a bare
  // setTimeout fires after the game page is gone (React no-ops the setState,
  // but the timer keeps the component closure alive for its full duration).
  const burstTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  // ── UI zoom: a pure function of the window width, applied via CSS `zoom`
  // (NOT transform scale — scale doesn't affect layout, which caused the
  // clipped scrolling and jitter of the old fit loop). ──
  const [uiZoom, setUiZoom] = useState(() =>
    typeof window === "undefined" ? 1 : gameZoom(window.innerWidth),
  );

  const active = GAME_CAR_MAP[state.activeCarId] ?? GAME_CAR_MAP[STARTER_ID];
  const level = levelFrom(state);
  const cash = state.cash;
  // Keep sub-$1 precision — early-game rates ($0.15/s) must not round to $0.
  // fmtMoney adds cents under $10, so pass the raw rate through.
  const income = passivePerSec(state) * globalMultiplier;
  const perClick = clickValue(state) * globalMultiplier;
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

  // Keep the zoom in sync with the window width. It's a pure function of
  // width — no content measurement, no feedback loop, no oscillation. The
  // shell's scroll container sees the real (zoomed) layout, so nothing can
  // clip and every tab scrolls natively.
  useEffect(() => {
    const onResize = () => setUiZoom(gameZoom(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset the shell's scroll position when the tab changes. Without this,
  // switching from a long tab (Garage) back to a short one (Earn,
  // Leaderboard) left the viewport mid-scrolled, so the UI appeared to
  // "jump"/keep moving after every tab switch.
  useEffect(() => {
    rootRef.current?.parentElement?.scrollTo?.({ top: 0 });
  }, [tab]);

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
      clickBlockedRef.current = true;
      setClickBlocked(true);
      toast.error("Too fast! Auto-clicking detected. Clicking paused.", {
        duration: BURST_PENALTY_MS,
        style: { background: "#1a0404", border: "1px solid rgba(255,0,0,0.4)", color: "#fff" },
      });
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = window.setTimeout(() => {
        clickBlockedRef.current = false;
        setClickBlocked(false);
        clickTimestamps.current = [];
        burstTimerRef.current = null;
      }, BURST_PENALTY_MS);
      return;
    }
    // Honor the active lockout synchronously — no dispatches, no popup churn
    // while clicking is paused (the visible state was already updated).
    if (clickBlockedRef.current) return;

    const crit = Math.random() < critChance(state);
    const amount = Math.round(perClick * (crit ? 5 : 1));
    dispatch({ type: "CLICK", amount, globalMultiplier });
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++popupId.current;
    // Popup coordinates live inside the CSS-zoomed tree — convert the
    // visual (post-zoom) pointer offset back into local layout pixels.
    const s = SITE_ZOOM * uiZoom || 1;
    const popup: Popup = {
      id,
      x: (e.clientX - rect.left) / s + (Math.random() * 40 - 20),
      y: (e.clientY - rect.top) / s - 10,
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
    // No window.confirm — sandboxed preview iframes block confirm dialogs,
    // which would make reset unreachable. Hard reset IS the confirmation:
    // the button sits behind the "Danger zone" label in the save/reset UI.
    dispatch({ type: "HARD_RESET" });
    toast.success("Progress reset — fresh garage.");
  };

  // Layout constant for the rails' fixed height: the game root's 0.5rem×2
  // padding, plus the event banner's share of the slot while one is active.
  // (The site header is already excluded from the slot by vpFill/vpRail.)
  const railExtraRem = 1 + (activeEvent ? gameEventBannerRem(uiZoom) : 0);

  return (
    <>
      {/* ── Game root. The whole site renders at browser-zoom scale via the
          site zoom on #root (SITE_ZOOM); the game adds no scale of its own
          (uiZoom = SITE_ZOOM). minHeight is divided by the total effective
          zoom so it lands at exactly one real viewport — no dead band. ── */}
      <div
        ref={rootRef}
        className="flex w-full flex-col overflow-visible px-2 py-2 sm:px-3 lg:px-4"
        style={{
          zoom: uiZoom,
          minHeight: vpFill(SITE_ZOOM * uiZoom),
        }}
      >
      {/* ── Active Event Banner ── */}
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 overflow-hidden rounded-xl border border-apex-red/50 bg-gradient-to-r from-apex-red/20 via-orange-600/20 to-apex-red/20 p-3 md:mb-4 md:p-4"
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
                <p className="text-[12px] text-white/50">
                  All earnings multiplied · Expires in <CountdownTimer expiresAt={activeEvent.expiresAt} />
                </p>
              </div>
            </div>
            <span className="font-display text-2xl font-black text-apex-red">
              {activeEvent.multiplier}x
            </span>
          </div>
        </motion.div>
      )}      {/* ── Header ── */}
      <div className="mb-1 flex items-center justify-between gap-1">
        <div>
          <p className="inline-flex items-center gap-1 font-display text-[9px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            <span className="inline-block size-1 rounded-full bg-apex-red" />
            The Garage Tycoon
          </p>
          <h1 className="font-display text-lg font-black tracking-tight text-white sm:text-xl">
            GAME
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Back-to-site is now redundant — the site header (with Home,
              Feedback, etc.) is always visible above the game — but keep a
              small home shortcut in the row. */}
          <Link
            to="/"
            className="inline-flex size-7 items-center justify-center rounded-md border border-white/15 text-white/60 transition-colors hover:border-apex-red hover:text-white"
            title="Home"
            aria-label="Home"
          >
            <Home className="size-3.5" />
          </Link>
          {/* Desktop pill row — unchanged on md+. Mobile gets the organized
              stat strip below instead of five cramped 9px pills. */}
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
          <StatPill icon={Coins} label="Cash" value={fmtMoney(cash)} accent />
          <StatPill icon={TrendingUp} label="Income/s" value={fmtMoney(income)} />
          <StatPill icon={Star} label="Level" value={String(level)} />
          <StatPill icon={Shield} label="Rep" value={String(Math.round(state.reputation).toLocaleString())} />
          <StatPill icon={CarIcon} label="Cars" value={String(Object.keys(state.ownedCars).length)} />
          {!chatOpen && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-apex-panel px-1.5 py-0.5 text-[10px] font-bold text-white/50 transition-colors hover:border-apex-red hover:text-white md:flex"
            >
              <MessageCircle className="size-2.5" />
              Chat
            </button>
          )}
          </div>
        </div>
      </div>

      {/* ── Mobile stat strip — three organized, readable cells replace the
          cramped pill row. Desktop keeps the pills above. ── */}
      <div className="mb-2 grid grid-cols-3 divide-x divide-apex-line overflow-hidden rounded-lg border border-apex-line bg-apex-panel md:hidden">
        <div className="min-w-0 px-2 py-1.5 text-center">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Cash</p>
          <p className="truncate font-display text-sm font-black text-apex-red">{fmtMoney(cash)}</p>
        </div>
        <div className="min-w-0 px-2 py-1.5 text-center">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Per sec</p>
          <p className="truncate font-display text-sm font-black text-white">{fmtMoney(income)}</p>
        </div>
        <div className="min-w-0 px-2 py-1.5 text-center">
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Level</p>
          <p className="truncate font-display text-sm font-black text-white">{level}</p>
        </div>
      </div>

      {/* ── Mobile action row (compact, thumb-friendly) ── */}
      <div className="mb-1 flex items-center gap-1.5 md:hidden">
        <button
          type="button"
          onClick={claimDaily}
          disabled={!canClaim}
          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-apex-red/40 bg-apex-red/10 px-2.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors active:bg-apex-red disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
        >
          <Gift className="size-4 text-apex-red" />
          {canClaim ? `Daily ${fmtMoney(daily)}` : `Daily in ${waitLabel}`}
          {state.daily.streak > 1 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">×{state.daily.streak}</span>
          )}
        </button>
        <button
          type="button"
          onClick={saveNow}
          className="inline-flex size-[38px] items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors active:border-apex-red active:text-white"
          aria-label="Save game"
          title="Save game"
        >
          <Save className="size-4" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-stretch gap-3 overflow-visible">
        {/* ── Left sidebar (desktop) ── */}
        <aside
          className="z-10 hidden w-[18rem] shrink-0 flex-col gap-2 md:sticky md:flex"
          style={{
            // FIXED height — identical on every tab — so switching Earn ↔
            // Garage ↔ Leaderboard can never stretch/squeeze the rails or
            // reshuffle the nav. Fills the game slot (viewport minus the
            // site header) exactly. Sticky keeps the nav and the save/reset
            // block pinned on screen while long panels scroll beside them.
            height: vpRail(SITE_ZOOM * uiZoom, railExtraRem),
            top: "0.5rem",
          }}
        >
          {/* Balance */}
          <div className="rounded-xl border border-apex-line bg-apex-panel px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Cash
            </p>
            <p className="font-display text-base font-black tracking-tight text-white">
              {fmtMoney(cash)}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1 border-t border-apex-line pt-1 text-center">
              <div>
                <p className="font-display text-xs font-black text-apex-red">{fmtMoney(income)}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  /sec
                </p>
              </div>
              <div>
                <p className="font-display text-xs font-black text-white">{fmtMoney(perClick)}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  click
                </p>
              </div>
            </div>
          </div>

          {/* Level / XP */}
          <div className="rounded-xl border border-apex-line bg-apex-panel px-2.5 py-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                Level {level}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Prestige {state.prestigeLevel}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              {/* initial={false} — animate only on real value changes, not
                  when the tab remounts this component (no re-sweep). */}
              <motion.div
                className="h-full rounded-full bg-apex-red"
                initial={false}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {fmtMoney(xpIntoLevel)} / {fmtMoney(xpForLevel)} xp
            </p>
          </div>

          {/* Nav */}
          <nav className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto rounded-xl border border-apex-line bg-apex-panel p-0.5">
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
                    "flex min-h-[30px] flex-1 items-center gap-2 rounded-md px-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.10em] transition-colors",
                    isActive
                      ? "border-l-2 border-apex-red bg-apex-red/10 text-white"
                      : "border-l-2 border-transparent text-white/45 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", isActive ? "text-apex-red" : "text-white/40")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Daily + save/reset */}
          <div className="mt-auto rounded-xl border border-apex-line bg-apex-panel px-2 py-1.5">
            <button
              type="button"
              onClick={claimDaily}
              disabled={!canClaim}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
                canClaim
                  ? "bg-apex-red text-white hover:bg-apex-red/80"
                  : "cursor-not-allowed border border-white/10 bg-white/5 text-white/40",
              )}
            >
              <Gift className={cn("size-3.5", canClaim ? "text-white" : "text-white/40")} />
              {canClaim ? `Daily ${fmtMoney(daily)}` : `Daily in ${waitLabel}`}
              {state.daily.streak > 1 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">×{state.daily.streak}</span>
              )}
            </button>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={saveNow}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
              >
                <Save className="size-3" /> Save
              </button>
              <button
                type="button"
                onClick={resetNow}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red"
              >
                <Trash2 className="size-3" /> Reset
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Garage Tycoon · v1
            </p>
          </div>
        </aside>

        {/* ── Main area ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible">
          {tab === "earn" ? (
            <EarnZone
              state={state}
              dispatch={dispatch}
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

          {/* (Old mobile nav strip removed — superseded by the fixed bottom
              tab bar; nothing renders here on any width.) */}
        </main>

        {/* ── Chat panel (desktop) ── */}
        <ChatPanel
          open={chatOpen}
          onToggle={() => setChatOpen((v) => !v)}
          height={vpRail(SITE_ZOOM * uiZoom, railExtraRem)}
        />
      </div>

      {/* Bottom-bar spacer — INSIDE the game root (so it joins the scroll
          flow and content can scroll clear of the fixed tab bar) and inside
          the zoom wrapper (so it scales with the game, never leaving a dead
          band). Desktop ignores it. */}
      <div className="h-[76px] md:hidden" aria-hidden="true" />
      </div>

      {/* ── Mobile bottom tab bar — FIXED OUTSIDE the zoom wrapper (fixed
          positioning inside a CSS-zoom tree scales its viewport coordinates,
          so a future SITE_ZOOM ≠ 1 would shove the bar off-screen; the
          GiftModal/MobileChatSheet already follow this pattern). Safe-area
          aware, thumb-reachable. Primary tabs get their own slot; the
          remaining 10 live under More. ── */}
      {/* Tap-away layer: touch has no Escape, so a tap anywhere outside the
          bar dismisses the More sheet. Desktop never renders it (md:hidden). */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-apex-line bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" style={{ touchAction: "manipulation" }}>
        <div className="mx-auto grid max-w-lg grid-cols-6 px-1 select-none">
          {PRIMARY_TABS.map((id) => {
            const item = NAV.find((n) => n.id === id)!;
            const Icon = item.icon;
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setMoreOpen(false);
                }}
                className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-0.5 font-display text-[9px] font-bold uppercase tracking-[0.08em] transition-colors"
              >
                <Icon className={cn("size-5 transition-colors", isActive ? "text-apex-red" : "text-white/45")} />
                <span className={isActive ? "text-white" : "text-white/45"}>{item.label}</span>
                {isActive && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-apex-red" />}
              </button>
           );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-0.5 font-display text-[9px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            <Menu className={cn("size-5 transition-colors", moreOpen ? "text-apex-red" : "text-white/45")} />
            <span className={moreOpen ? "text-white" : "text-white/45"}>More</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileChatOpen(true)}
            className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-0.5 font-display text-[9px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            <MessageCircle className="size-5 text-white/45" />
            <span className="text-white/45">Chat</span>
          </button>
        </div>
        {/* More — sheet of the remaining tabs, overlaying the content */}
        {moreOpen && (
          <div className="max-h-[45dvh] overflow-y-auto border-t border-apex-line bg-black/95 p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {NAV.filter((item) => !PRIMARY_TABS.includes(item.id)).map((item) => {
                const Icon = item.icon;
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
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 font-display text-[9px] font-bold uppercase tracking-[0.08em] transition-colors",
                      tab === item.id
                        ? "border-apex-red/50 bg-apex-red/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/55",
                    )}
                  >
                    <Icon className="size-4 text-apex-red" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {/* Hard reset — removed from the mobile action row, kept reachable
                here behind a deliberate trip into More. */}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                resetNow();
              }}
              className="mt-1.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/40 transition-colors active:border-apex-red active:text-apex-red"
            >
              <Trash2 className="size-4" /> Reset Progress
            </button>
          </div>
        )}
      </div>

      {/* Gift modal sits outside the zoom wrapper so it stays viewport-fixed */}
      <GiftModal
        open={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        currentCash={cash}
        onSent={(amount) => dispatch({ type: "ADD_CASH", amount: -amount })}
      />

      {/* Mobile chat — full-screen sheet, thumb-typing height. The desktop
          rail (hidden md:flex) is untouched. */}
      <MobileChatSheet
        open={mobileChatOpen}
        onClose={() => setMobileChatOpen(false)}
      />
    </>
  );
}

function EarnZone({
  state,
  dispatch,
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
  dispatch: React.Dispatch<Action>;
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
  // Real crit chance from the engine — the old local formula (prestige-based)
  // showed a different percentage than the one actually used on click.
  const crit = critChance(state);
  const ownedCount = Object.keys(state.ownedCars).length;
  const upgradeCount = Object.values(state.ownedCars).reduce(
    (sum: number, c: any) => sum + Object.values(c?.upgrades ?? {}).reduce((s: number, v: any) => s + (v as number), 0),
    0,
  );
  const daily = dailyReward(state, state.lastTick);
  const streak = state.daily.streak;

  return (
    <div className="relative flex min-h-0 flex-col md:h-full">
      {/* ── Earn header with stats row ── */}
      <div className="order-1 mb-2 md:order-none">
        <div className="flex items-center justify-between">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Earn
          </p>
          <span className="hidden font-display text-[10px] font-bold uppercase tracking-[0.16em] text-white/30 md:inline">
            Tap the car to earn cash
          </span>
        </div>
        {/* Quick stats strip */}
        <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          <EarnStat value={fmtMoney(perClick)} label="Per click" accent />
          <EarnStat value={fmtMoney(income)} label="Per second" />
          <EarnStat value={fmtMoney(carValue(state, state.activeCarId))} label="Car value" />
          <EarnStat value={carPower(state, state.activeCarId).toLocaleString()} label="Horsepower" />
          <EarnStat value={fmtMoney(totalEarned)} label="Total earned" />
          <EarnStat value={totalClicks.toLocaleString()} label="Total clicks" />
        </div>
      </div>

      {/* ── Detailed info strip ── */}
      <div className="order-3 mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:order-none">
        <div className="rounded-lg border border-apex-line bg-apex-panel px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Daily Reward</p>
          <p className="font-display text-xs font-black text-apex-red">{fmtMoney(daily)}</p>
          {streak > 1 && <p className="text-[9px] text-white/40">Streak: {streak}×</p>}
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Crit Chance</p>
          <p className="font-display text-xs font-black text-amber-400">{Math.round(crit * 100)}%</p>
          <p className="text-[9px] text-white/40">5× multiplier</p>
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Garage</p>
          <p className="font-display text-xs font-black text-white">{ownedCount} cars</p>
          <p className="text-[9px] text-white/40">{upgradeCount} upgrades</p>
        </div>
        <div className="rounded-lg border border-apex-line bg-apex-panel px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Reputation</p>
          <p className="font-display text-xs font-black text-emerald-400">{Math.round(state.reputation).toLocaleString()}</p>
          <p className="text-[9px] text-white/40">Prestige {state.prestigeLevel}</p>
        </div>
      </div>

      {/* ── Car click zone ── */}
      <div
        onClick={onCarClick}
        className={cn(
          "group relative order-2 flex min-h-[320px] flex-col cursor-pointer select-none overflow-hidden rounded-2xl border bg-[#0b0b0c] transition-all md:order-none md:min-h-[420px] md:flex-1",
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

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-2 sm:p-4">
          {/* Car badge + name */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                borderColor: rarityMeta.color,
                color: rarityMeta.color,
                background: `${rarityMeta.color}14`,
              }}
            >
              {rarityMeta.label}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {active.brand} · {active.year}
            </span>
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl">
            {active.name}
          </h2>

          {/* Car image */}
          <motion.div whileTap={{ scale: clickBlocked ? 1 : 0.97 }} className="relative mt-2 w-full max-w-5xl flex-1 flex flex-col justify-center min-h-0">
            <SmartImage
              src={gameCarImage(active)}
              alt={active.name}
              className={cn(
                "mx-auto w-full max-h-[300px] sm:max-h-[380px] lg:max-h-[460px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-300",
                clickBlocked ? "opacity-50 grayscale" : "",
              )}
            />
            <div
              className="pointer-events-none absolute inset-x-10 bottom-2 h-8 rounded-[100%] opacity-60 blur-xl"
              style={{ background: rarityMeta.glow }}
            />
          </motion.div>

          {/* Condition + Fuel bars + car specs row */}
          <div className="mt-2 w-full max-w-xl space-y-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span>Condition</span>
                <span>{Math.round(condition * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-apex-red"
                  initial={false}
                  animate={{ width: `${condition * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
            {/* Fuel bar */}
            {(() => {
              const fuel = state.ownedCars[state.activeCarId]?.fuel ?? FUEL_MAX;
              const fuelPct = (fuel / FUEL_MAX) * 100;
              const cost = fuelCost(state, state.activeCarId);
              const outOfFuel = fuel <= 0;
              return (
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    <span>Fuel</span>
                    <span className={cn(outOfFuel ? "text-red-400 font-bold" : "")}>{fuel}/{FUEL_MAX}{outOfFuel ? " — STOPPED" : ""}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={cn("h-full rounded-full", outOfFuel ? "bg-red-500" : fuelPct < 25 ? "bg-amber-400" : "bg-emerald-400")}
                      initial={false}
                      animate={{ width: `${fuelPct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  {outOfFuel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (state.cash < cost) { toast.error("Not enough cash to refuel!"); return; }
                        dispatch({ type: "BUY_FUEL", carId: state.activeCarId });
                        toast.success(`Refueled for ${fmtMoney(cost)}`);
                      }}
                      className="mt-1 w-full rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300 transition-colors hover:bg-amber-400/20"
                    >
                      ⛽ Buy Fuel — {fmtMoney(cost)}
                    </button>
                  )}
                  {!outOfFuel && fuel < FUEL_MAX && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (state.cash < cost) { toast.error("Not enough cash to refuel!"); return; }
                        dispatch({ type: "BUY_FUEL", carId: state.activeCarId });
                        toast.success(`Refueled for ${fmtMoney(cost)}`);
                      }}
                      className="mt-1 w-full rounded-md border border-white/15 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/50 transition-colors hover:border-emerald-400 hover:text-emerald-400"
                    >
                      ⛽ Refuel — {fmtMoney(cost)}
                    </button>
                  )}
                </div>
              );
            })()}
            {/* Quick specs */}
            <div className="hidden items-center justify-center gap-4 text-[10px] uppercase tracking-[0.14em] text-white/40 md:flex">
              <span className="flex items-center gap-1"><Zap className="size-3 text-apex-red" /> {carPower(state, state.activeCarId).toLocaleString()} hp</span>
              <span className="flex items-center gap-1"><TrendingUp className="size-3 text-emerald-400" /> {fmtMoney(perClick)}/click</span>
              <span className="flex items-center gap-1"><Coins className="size-3 text-amber-400" /> {fmtMoney(income)}/sec</span>
            </div>
          </div>

          {/* Click prompt */}
          {clickBlocked ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5">
              <Shield className="size-4 text-red-400" />
              <span className="font-display text-[12px] font-bold uppercase tracking-[0.2em] text-red-400">
                Clicking paused — too fast
              </span>
            </div>
          ) : (
            <p className="mt-2 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-apex-red/40 bg-apex-red/10 px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors group-hover:bg-apex-red group-active:bg-apex-red">
              <MousePointerClick className="size-4" />
              <span className="hidden sm:inline">Click the car to earn</span>
              <span className="sm:hidden">Tap the car to earn</span>
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

/** Staff identity — mirrors ChatPanel's announcement-overlay colors. */
const STAFF_STYLES: Record<
  string,
  { label: string; name: string; glow: string; border: string; badgeBg: string; ring: string }
> = {
  owner: {
    label: "OWNER",
    name: "text-amber-400",
    glow: "rgba(234,179,8,0.45)",
    border: "border-amber-400/60",
    badgeBg: "bg-amber-400/15 text-amber-300",
    ring: "ring-amber-400/70",
  },
  admin: {
    label: "ADMIN",
    name: "text-apex-red",
    glow: "rgba(255,46,0,0.45)",
    border: "border-apex-red/60",
    badgeBg: "bg-apex-red/15 text-apex-red",
    ring: "ring-apex-red/70",
  },
  moderator: {
    label: "MOD",
    name: "text-emerald-400",
    glow: "rgba(34,197,94,0.45)",
    border: "border-emerald-400/50",
    badgeBg: "bg-emerald-400/15 text-emerald-300",
    ring: "ring-emerald-400/60",
  },
};

function formatChatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/** The verified check next to staff names in the mobile chat sheet. */
function StaffMark({ role }: { role: string }) {
  const style = STAFF_STYLES[role];
  if (!style) return null;
  return (
    <span
      title={`Verified ${style.label}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-px",
        style.badgeBg,
      )}
    >
      {role === "owner" ? (
        <Crown className="size-2.5" strokeWidth={2.5} />
      ) : role === "admin" ? (
        <Shield className="size-2.5" strokeWidth={2.5} />
      ) : (
        <BadgeCheck className="size-3" strokeWidth={2.5} />
      )}
    </span>
  );
}

function EarnStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-apex-line bg-apex-panel px-1.5 py-1.5 text-center md:rounded-none md:border-0">
      <p className={cn("font-display text-xs font-black", accent ? "text-apex-red" : "text-white")}>
        {value}
      </p>
      <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
    </div>
  );
}

/**
 * Mobile full-screen chat sheet — mirrors ChatPanel's messages, send and
 * staff-delete logic exactly, but sized for thumbs: full width, sticky
 * header/input with safe-area padding. Desktop keeps the side rail.
 */
function MobileChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAuthenticated } = useAuth();
  // Skip the subscription while closed — the sheet is always mounted, and an
  // always-live duplicate of the rail's chat query re-rendered the whole game
  // on every chat message.
  const messages = useQuery(api.chat.getMessages, open ? {} : "skip") ?? [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const deleteMessage = useMutation(api.chat.deleteMessage);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myRole = user?.role ?? null;
  const isStaff = myRole === "owner" || myRole === "admin" || myRole === "moderator";
  const onlineNow = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) set.add(m.userId);
    return set.size;
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!open || !el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length, autoScroll]);

  const handleSend = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ text: msg });
      setText("");
      setAutoScroll(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  }, [text, sending, sendMessage]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage({ messageId: messageId as never });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete message");
      }
    },
    [deleteMessage],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0c]">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-apex-line bg-black/85 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-md border border-white/15 text-white/70 active:border-apex-red active:text-white"
          aria-label="Close chat"
        >
          <X className="size-4" />
        </button>
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">Chat</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-green-400">
          <span className="size-1 animate-pulse rounded-full bg-green-400" />
          Live · {onlineNow}
        </span>
        {isStaff && myRole && STAFF_STYLES[myRole] && <StaffMark role={myRole} />}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        className="chat-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2"
      >
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/25">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const mine = user != null && msg.userId === user._id;
          const style = msg.role ? STAFF_STYLES[msg.role] : undefined;
          const isStaffMsg = Boolean(style);
          const canDelete = isStaff && !mine;
          return (
            <div key={msg._id} className={cn("flex items-start gap-2", mine && "flex-row-reverse")}>
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1",
                  mine
                    ? "bg-apex-red/25 text-apex-red ring-apex-red/50"
                    : isStaffMsg
                      ? cn(style!.badgeBg, style!.ring)
                      : "bg-white/10 text-white/70 ring-white/15",
                )}
              >
                {(mine ? (user?.username ?? user?.name) : msg.name)?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div
                style={isStaffMsg && !mine ? { boxShadow: `0 0 12px ${style!.glow}` } : undefined}
                className={cn(
                  "min-w-0 max-w-[82%] rounded-xl border px-2.5 py-1.5",
                  mine
                    ? "border-apex-red/30 bg-apex-red/10"
                    : isStaffMsg
                      ? style!.border
                      : "border-white/[0.06] bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "truncate text-[11px] font-bold",
                      mine ? "text-apex-red" : isStaffMsg ? style!.name : "text-white/60",
                    )}
                  >
                    {mine ? (user?.username ?? user?.name ?? "You") : msg.name}
                  </span>
                  {isStaffMsg && <StaffMark role={msg.role!} />}
                  {isStaffMsg && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-px text-[8px] font-black uppercase tracking-wider",
                        style!.badgeBg,
                      )}
                    >
                      {style!.label}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[9px] text-white/25">
                    {formatChatTime(msg.createdAt)}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(msg._id)}
                      aria-label="Delete message"
                      title="Delete message"
                      className="ml-1 flex size-6 shrink-0 items-center justify-center rounded text-white/30 active:text-apex-red"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 break-words text-[13px] leading-snug text-white/85">
                  {msg.text}
                </p>
              </div>
        </div>
          );
        })}
      </div>

      {/* Input — big touch target, safe-area bottom */}
      <div className="border-t border-apex-line bg-black/85 px-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            enterKeyHint="send"
            autoComplete="off"
            placeholder={
              !isAuthenticated ? "Sign in to chat" : (error ?? "Message the garage…")
            }
            disabled={!isAuthenticated || sending}
            className={cn(
              "min-h-[42px] min-w-0 flex-1 rounded-lg border bg-white/5 px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-apex-red/50",
              error ? "border-red-500/40 placeholder:text-red-300/70" : "border-white/10",
            )}
          />
          <button
            type="submit"
            disabled={!isAuthenticated || !text.trim() || sending}
            className="flex size-[42px] shrink-0 items-center justify-center rounded-lg bg-apex-red text-white transition-all active:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
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
    <div className="flex items-center gap-1 rounded-md border border-apex-line bg-apex-panel px-1.5 py-0.5">
      <Icon className={cn("size-2.5", accent ? "text-apex-red" : "text-white/40")} />
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <span className="font-display text-[12px] font-black text-white">{value}</span>
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
  const playerLevel = levelFrom(state);
  // The WEEKLY_CHECK itself is guarded in the reducer; the effect only needs
  // to fire when the stored week/level actually disagrees with reality —
  // including a raw `now` (changes every ms) re-ran it every single render.
  //
  // FREEZE GUARD: with (weekly.genLevel, playerLevel) in the deps, a
  // level-up burst dispatches WEEKLY_CHECK every render until the state
  // catches up — hundreds of reducer passes a frame on high level-up
  // spikes, which froze the whole page. The ref latch fires at most once
  // per (week, level) signature; a genuine week rollover or level change
  // still re-fires because the reducer resolves the signature.
  const weeklyLatchRef = useRef<string | null>(null);
  const weeklySignature = `${weekly.weekStart}:${weekly.genLevel}:${playerLevel}`;
  useEffect(() => {
    if (weekly.weekStart === currentMondayStr && weekly.genLevel === playerLevel) return;
    if (weeklyLatchRef.current === weeklySignature) return;
    weeklyLatchRef.current = weeklySignature;
    dispatch({ type: "WEEKLY_CHECK", now: Date.now() });
  }, [weeklySignature, weekly.weekStart, weekly.genLevel, currentMondayStr, playerLevel, dispatch]);

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              Weekly Challenges
            </p>
            <h3 className="mt-0.5 font-display text-lg font-black tracking-tight text-white">
              CHALLENGES
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-300/5 px-2.5 py-1">
            <Clock className="size-3 text-amber-300" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-amber-300">
              Resets in {timeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {weekly.challenges.map((ch) => {
          const pct = Math.min(100, (ch.progress / ch.target) * 100);
          const complete = ch.progress >= ch.target;
          // Progress reads as dollars for earn-challenges, a plain count otherwise.
          const isCash = (ch.metric ?? "earned") === "earned";
          const fmt = (n: number) => (isCash ? fmtMoney(n) : fmtNum(n));
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
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {ch.desc}
                  </p>
                </div>
                {ch.claimed && (
                  <span className="rounded-sm bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                    Claimed
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-1.5">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-white/40">
                    {fmt(ch.progress)} / {fmt(ch.target)}
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
                <div className="flex items-center gap-2 text-[10px]">
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
                    className="rounded-md bg-amber-400 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-amber-300"
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
