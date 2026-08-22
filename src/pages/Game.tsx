import { useEffect, useReducer, useRef } from "react";
import { GameMain } from "@/components/game/GameMain";
import { gameReducer, loadGame, saveGame } from "@/game/engine";

const SAVE_INTERVAL_MS = 5000;

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const stateRef = useRef(state);

  // Keep the latest state available to the save handlers without re-creating them.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Persist every few seconds and on tab hide/unload — never on every 1s tick,
  // which was hammering localStorage and causing the game to lag.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (stateRef.current) saveGame(stateRef.current);
    }, SAVE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && stateRef.current) saveGame(stateRef.current);
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
      // Leaving the /game route — flush the latest state instead of losing up to 5s.
      if (stateRef.current) saveGame(stateRef.current);
    };
  }, []);

  // Passive income tick.
  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <GameMain state={state} dispatch={dispatch} />;
}
