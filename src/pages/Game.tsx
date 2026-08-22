import { useEffect, useReducer } from "react";
import { GameMain } from "@/components/game/GameMain";
import { gameReducer, loadGame, saveGame } from "@/game/engine";

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);

  // Persist on every change.
  useEffect(() => {
    saveGame(state);
  }, [state]);

  // Passive income tick.
  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <GameMain state={state} dispatch={dispatch} />;
}
