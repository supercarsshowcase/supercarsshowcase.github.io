import { useEffect, useReducer, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { GameMain } from "@/components/game/GameMain";
import { gameReducer, loadGame, saveGame } from "@/game/engine";

const SAVE_INTERVAL_MS = 5000;

export default function Game() {
  const activeEvent = useQuery(api.adminAbuse.getActiveEvent);
  const gifts = useQuery(api.adminAbuse.getMyGifts);
  const claimGift = useMutation(api.adminAbuse.claimGift);

  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const stateRef = useRef(state);
  const globalMultiplier = activeEvent?.multiplier ?? 1;
  const globalMultiplierRef = useRef(globalMultiplier);

  // Keep the latest state and multiplier available to handlers.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    globalMultiplierRef.current = globalMultiplier;
  }, [globalMultiplier]);

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
      }
      // Mark as claimed in the backend (fire-and-forget).
      void claimGift({ giftId: gift._id });
    }
  }, [gifts, claimGift]);

  // Persist every few seconds and on tab hide/unload.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (stateRef.current) saveGame(stateRef.current);
    }, SAVE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && stateRef.current)
        saveGame(stateRef.current);
    };
    const onPageHide = () => {
      if (stateRef.current) saveGame(stateRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (stateRef.current) saveGame(stateRef.current);
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

  return (
    <GameMain
      state={state}
      dispatch={dispatch}
      globalMultiplier={globalMultiplier}
      activeEvent={activeEvent}
    />
  );
}
