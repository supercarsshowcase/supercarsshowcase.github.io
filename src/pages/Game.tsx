import { useEffect, useReducer, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { GameMain } from "@/components/game/GameMain";
import { gameReducer, loadGame, saveGame } from "@/game/engine";
import { levelFrom } from "@/game/data";

const SAVE_INTERVAL_MS = 5000;

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
      void saveCloudSave({ state: JSON.stringify(stateRef.current) });
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
      } else if (gift.kind === "car" && gift.carId) {
        dispatch({ type: "ADD_CAR", carId: gift.carId });
        toast.success(`🏎️ Admin Gift: A new car was added to your garage!`, {
          duration: 8000,
          style: { background: "#1a0a04", border: "1px solid rgba(255,46,0,0.4)", color: "#fff" },
        });
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
      // Mark as claimed in the backend (fire-and-forget).
      void claimGift({ giftId: gift._id });
    }
  }, [gifts, claimGift]);

  // Persist every few seconds and on tab hide/unload.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (stateRef.current) {
        saveGame(stateRef.current);
        saveCloudRef.current();
      }
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
    const id = window.setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      void upsertScore({
        cash: s.cash,
        totalEarned: s.totalEarned,
        level: levelFrom(s),
        prestigeLevel: s.prestigeLevel,
        carCount: Object.keys(s.ownedCars).length,
      });
    }, 30_000);
    // Also update on first mount after a short delay.
    const initial = setTimeout(() => {
      const s = stateRef.current;
      if (!s) return;
      void upsertScore({
        cash: s.cash,
        totalEarned: s.totalEarned,
        level: levelFrom(s),
        prestigeLevel: s.prestigeLevel,
        carCount: Object.keys(s.ownedCars).length,
      });
    }, 3000);
    return () => { window.clearInterval(id); clearTimeout(initial); };
  }, []);

  return (
    <GameMain
      state={state}
      dispatch={dispatch}
      globalMultiplier={globalMultiplier}
      activeEvent={effectiveEvent}
    />
  );
}
