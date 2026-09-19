import { useEffect, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoonStar, TrendingUp, Clock, Zap } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { GameMain } from "@/components/game/GameMain";
import { gameReducer, loadGame, saveGame, passivePerSec } from "@/game/engine";
import { GAME_CARS, levelFrom, fmtMoney } from "@/game/data";

const SAVE_INTERVAL_MS = 5000;
/** Offline earnings: 50% of your per-second income while away… */
const OFFLINE_RATE = 0.5;
/** …capped at 8 hours, and only shown for absences over a minute. */
const OFFLINE_CAP_MS = 8 * 3_600_000;
const OFFLINE_MIN_AWAY_MS = 60_000;

export default function Game() {
  const activeEvent = useQuery(api.adminAbuse.getActiveEvent);
  const gifts = useQuery(api.adminAbuse.getMyGifts);
  const claimGift = useMutation(api.adminAbuse.claimGift);
  const upsertScore = useMutation(api.leaderboard.upsertScore);

  const { isAuthenticated } = useConvexAuth();
  const loadCloudSave = useQuery(api.gameSaves.load);
  const saveCloudSave = useMutation(api.gameSaves.save);
  const cloudLoadedRef = useRef(false);

  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const stateRef = useRef(state);
  // The state as it existed at mount — offline earnings are computed against
  // THIS (stateRef mutates on every tick).
  const bootStateRef = useRef(state);
  // StrictMode runs mount effects twice (setup → cleanup → setup); without
  // this guard the offline claim would dispatch twice and double-pay.
  const offlineClaimedRef = useRef(false);
  const [offline, setOffline] = useState<{ amount: number; awayMs: number } | null>(null);

  // Local override: force event to null when it expires on the client side
  // (Convex queries only re-fire on data changes, not on a timer).
  const [eventExpired, setEventExpired] = useState(false);
  const effectiveEvent = eventExpired ? null : activeEvent;
  const globalMultiplier = effectiveEvent?.multiplier ?? 1;
  const globalMultiplierRef = useRef(globalMultiplier);

  // Reset the expired flag when a new event arrives from Convex.
  useEffect(() => {
    if (activeEvent) setEventExpired(false);
  }, [activeEvent]);

  // When the event expires, null it out locally.
  useEffect(() => {
    if (!activeEvent) return;
    const msLeft = activeEvent.expiresAt - Date.now();
    if (msLeft <= 0) { setEventExpired(true); return; }
    const timer = setTimeout(() => setEventExpired(true), msLeft + 500);
    return () => clearTimeout(timer);
  }, [activeEvent]);

  // Keep the latest state and multiplier available to handlers.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    globalMultiplierRef.current = globalMultiplier;
  }, [globalMultiplier]);

  // ── Offline earnings ──
  // Credited once on mount, BEFORE the first TICK — otherwise TICK's own dt
  // would re-credit the whole away-gap at 100%. Rate: half the live income,
  // capped at 8h, only for absences longer than a minute.
  useEffect(() => {
    if (offlineClaimedRef.current) return;
    offlineClaimedRef.current = true;
    const boot = bootStateRef.current;
    const awayMs = Date.now() - boot.lastTick;
    if (awayMs < OFFLINE_MIN_AWAY_MS) return;
    const cappedMs = Math.min(awayMs, OFFLINE_CAP_MS);
    const amount = Math.floor(passivePerSec(boot) * (cappedMs / 1000) * OFFLINE_RATE);
    // CLAIM_OFFLINE also advances lastTick, so the first live TICK doesn't
    // double-pay the gap (at zero earnings it just resets the clock).
    dispatch({ type: "CLAIM_OFFLINE", amount, now: Date.now() });
    if (amount > 0) setOffline({ amount, awayMs: cappedMs });
  }, []);

  // ── Cloud save sync ──
  // On mount, load cloud save and use it if newer than localStorage.
  useEffect(() => {
    if (!isAuthenticated || !loadCloudSave || cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;
    const { state: cloudState, updatedAt } = loadCloudSave;
    if (!cloudState) return;
    try {
      const cloud = JSON.parse(cloudState);
      const local = loadGame();
      // Use cloud save if it's newer or local has less total earned
      if (!local || cloud.totalEarned > local.totalEarned) {
        dispatch({ type: "LOAD", state: cloud });
        toast.success("☁️ Cloud save loaded!", {
          duration: 3000,
          style: { background: "#0a1520", border: "1px solid rgba(0,150,255,0.3)", color: "#fff" },
        });
      }
    } catch { /* ignore corrupt cloud save */ }
  }, [isAuthenticated, loadCloudSave]);

  // Save to cloud periodically alongside localStorage.
  // Use a ref so the interval always calls the latest version.
  const saveCloudRef = useRef<() => void>(() => {});
  saveCloudRef.current = () => {
    if (!isAuthenticated || !stateRef.current) return;
    try {
      // .catch so a failed cloud write (offline, auth expiry) can't surface
      // as an unhandled promise rejection — local saves already cover us.
      saveCloudSave({ state: JSON.stringify(stateRef.current) }).catch(
        () => {},
      );
    } catch { /* ignore */ }
  };

  // Consume admin gifts (money / cars) on mount and when new gifts arrive.
  const claimedGiftsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!gifts || gifts.length === 0) return;
    for (const gift of gifts) {
      if (claimedGiftsRef.current.has(gift._id)) continue;
      claimedGiftsRef.current.add(gift._id);
      if (gift.kind === "money" && gift.amount) {
        dispatch({ type: "ADD_CASH", amount: gift.amount });
        toast.success(`💰 Admin Gift: +$${gift.amount.toLocaleString()} added to your balance!`, {
          duration: 8000,
          style: { background: "#1a0a04", border: "1px solid rgba(255,46,0,0.4)", color: "#fff" },
        });
      } else if (gift.kind === "player_gift" && gift.amount) {
        // Player-to-player gifts were silently dropped here: the money was
        // marked claimed but never delivered. Deliver it now.
        dispatch({ type: "ADD_CASH", amount: gift.amount });
        toast.success(
          `🎁 ${gift.fromName ?? "A player"} sent you $${gift.amount.toLocaleString()}!`,
          {
            duration: 8000,
            style: { background: "#0a1a10", border: "1px solid rgba(0,220,130,0.4)", color: "#fff" },
          },
        );
      } else if (gift.kind === "car" && gift.carId) {
        dispatch({ type: "ADD_CAR", carId: gift.carId });
        toast.success(`🏎️ Admin Gift: A new car was added to your garage!`, {
          duration: 8000,
          style: { background: "#1a0a04", border: "1px solid rgba(255,46,0,0.4)", color: "#fff" },
        });
      } else if (gift.kind === "random_cars" && gift.amount) {
        // Admin "Send Cars" inserted kind "random_cars" but nothing consumed
        // it — the gift was marked claimed and the player got NOTHING.
        // Deliver up to `amount` random cars the player doesn't own yet
        // (secret achievement cars are never granted this way).
        const owned = stateRef.current?.ownedCars ?? {};
        const pool = GAME_CARS.filter((c) => !c.secret && !owned[c.id]);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, Math.min(gift.amount, 500));
        for (const car of picks) {
          dispatch({ type: "ADD_CAR", carId: car.id });
        }
        if (picks.length > 0) {
          toast.success(
            `🏎️ Admin Gift: ${picks.length.toLocaleString()} random car${picks.length === 1 ? "" : "s"} added to your garage!`,
            {
              duration: 8000,
              style: { background: "#1a0a04", border: "1px solid rgba(255,46,0,0.4)", color: "#fff" },
            },
          );
        } else {
          toast.info("Garage already owns every available car — nothing to add.");
        }
      } else if (gift.kind === "spins" && gift.amount) {
        dispatch({ type: "GIVE_SPINS", amount: gift.amount });
        toast.success(`🎰 Admin Gift: +${gift.amount.toLocaleString()} free spins!`, {
          duration: 8000,
          style: { background: "#1a0a04", border: "1px solid rgba(255,46,0,0.4)", color: "#fff" },
        });
      } else if (gift.kind === "reset" && gift.resetOptions) {
        dispatch({ type: "RESET_PROGRESS", resetOptions: gift.resetOptions });
        const labels = Object.entries(gift.resetOptions)
          .filter(([, v]) => v)
          .map(([k]) => k);
        toast.success(`⚠️ Admin Reset: Your ${labels.join(", ")} have been reset!`, {
          duration: 8000,
          style: { background: "#1a0404", border: "1px solid rgba(255,0,0,0.4)", color: "#fff" },
        });
      }
      // Mark as claimed in the backend (fire-and-forget; .catch prevents
      // unhandled rejections from a flaky network).
      claimGift({ giftId: gift._id }).catch(() => {});
    }
  }, [gifts, claimGift]);

  // Persist every few seconds and on tab hide/unload.
  // Cloud writes are 6× rarer than local ones: every cloud write also
  // invalidates the gameSaves.load query, which re-rendered the whole game
  // tree on top of the per-second TICK renders — a visible lag source.
  useEffect(() => {
    let ticks = 0;
    const id = window.setInterval(() => {
      if (!stateRef.current) return;
      saveGame(stateRef.current);
      ticks += 1;
      if (ticks % 6 === 0) saveCloudRef.current(); // ~every 30s
    }, SAVE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && stateRef.current) {
        saveGame(stateRef.current);
        saveCloudRef.current();
      }
    };
    const onPageHide = () => {
      if (stateRef.current) {
        saveGame(stateRef.current);
        saveCloudRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (stateRef.current) {
        saveGame(stateRef.current);
        saveCloudRef.current();
      }
    };
  }, []);

  // Passive income tick — reads multiplier from ref so it stays current.
  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({
        type: "TICK",
        now: Date.now(),
        globalMultiplier: globalMultiplierRef.current,
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Update leaderboard score every 30 seconds.
  useEffect(() => {
    // Fire-and-forget with .catch: an offline leaderboard write must not
    // surface as an unhandled promise rejection every 30s.
    const report = () => {
      const s = stateRef.current;
      if (!s) return;
      upsertScore({
        cash: s.cash,
        totalEarned: s.totalEarned,
        level: levelFrom(s),
        prestigeLevel: s.prestigeLevel,
        carCount: Object.keys(s.ownedCars).length,
      }).catch(() => {});
    };
    const id = window.setInterval(report, 30_000);
    // Also update on first mount after a short delay.
    const initial = setTimeout(report, 3000);
    return () => { window.clearInterval(id); clearTimeout(initial); };
  }, [upsertScore]);

  return (
    <>
      <GameMain
        state={state}
        dispatch={dispatch}
        globalMultiplier={globalMultiplier}
        activeEvent={effectiveEvent}
      />
      <AnimatePresence>
        {offline && (
          <OfflineEarningsModal
            amount={offline.amount}
            awayMs={offline.awayMs}
            perSec={passivePerSec(bootStateRef.current)}
            onClose={() => setOffline(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function formatAway(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Welcome-back overlay: count-up of the cash earned while away. */
function OfflineEarningsModal({
  amount,
  awayMs,
  perSec,
  onClose,
}: {
  amount: number;
  awayMs: number;
  perSec: number;
  onClose: () => void;
}) {
  // Count 0 → amount with an ease-out; short enough not to annoy.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(amount * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [amount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-apex-red/30 bg-[#0c0c0e] p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-apex-red/20 blur-3xl"
        />

        <div className="relative">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-apex-red/40 bg-apex-red/15">
            <MoonStar className="size-6 text-apex-red" />
          </span>
          <p className="mt-3 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-apex-red">
            Welcome back
          </p>
          <h2 className="mt-0.5 font-display text-xl font-black tracking-tight text-white">
            Offline Earnings
          </h2>

          {/* The count-up */}
          <p className="mt-4 font-display text-4xl font-black tabular-nums tracking-tight text-apex-red drop-shadow-[0_0_24px_rgba(255,46,0,0.35)]">
            {fmtMoney(shown)}
          </p>
          <p className="mt-1 text-xs text-white/40">added to your balance</p>

          {/* Summary rows */}
          <div className="mt-5 space-y-1.5 rounded-xl border border-apex-line bg-white/[0.03] p-3 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white/40">
                <Clock className="size-3.5" /> Time away
              </span>
              <span className="font-display font-bold text-white">{formatAway(awayMs)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white/40">
                <TrendingUp className="size-3.5" /> Your income
              </span>
              <span className="font-display font-bold text-white">{fmtMoney(perSec)}/s</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white/40">
                <Zap className="size-3.5" /> Offline rate
              </span>
              <span className="font-display font-bold text-amber-400">50% · 8h cap</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-apex-red py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(255,46,0,0.4)] transition-all hover:bg-apex-red-bright active:scale-[0.98]"
          >
            Collect
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
