import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGems, formatGems } from "@/context/gem-context";
import { GemDiamond } from "@/components/GemDiamond";
import { cn } from "@/lib/utils";

type GameMode = "coinflip" | "colordice" | "wheel";
type CoinSide = "heads" | "tails";
type RoundMode = 1 | 3 | 5;

interface CoinflipGame {
  id: number;
  mode: GameMode;
  betAmount: number;
  side: CoinSide;
  rounds: RoundMode;
  status: "waiting" | "playing" | "finished";
  playerScore: number;
  opponentScore: number;
  currentRound: number;
  result?: "win" | "lose";
}

export default function Multibattles() {
  const { gems, addGems, spendGems } = useGems();
  const [betAmount, setBetAmount] = useState(20_000_000);
  const [selectedSide, setSelectedSide] = useState<CoinSide>("heads");
  const [rounds, setRounds] = useState<RoundMode>(1);
  const [mode, setMode] = useState<GameMode>("coinflip");
  const [game, setGame] = useState<CoinflipGame | null>(null);
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const createGame = useCallback(() => {
    if (!spendGems(betAmount)) return;

    const newGame: CoinflipGame = {
      id: Date.now(),
      mode,
      betAmount,
      side: selectedSide,
      rounds,
      status: "playing",
      playerScore: 0,
      opponentScore: 0,
      currentRound: 0,
    };
    setGame(newGame);
  }, [spendGems, betAmount, mode, selectedSide, rounds]);

  const playRound = useCallback(() => {
    if (!game || isFlipping) return;

    setIsFlipping(true);

    // Simulate coin flip with animation delay
    setTimeout(() => {
      const result: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
      setFlipResult(result);

      setGame((prev) => {
        if (!prev) return prev;

        const playerWins = result === prev.side;
        const newPlayerScore = prev.playerScore + (playerWins ? 1 : 0);
        const newOpponentScore = prev.opponentScore + (playerWins ? 0 : 1);
        const newRound = prev.currentRound + 1;

        // Check if game is over
        const winsNeeded = Math.ceil(prev.rounds / 2) + 0.5;
        if (newPlayerScore >= winsNeeded || newOpponentScore >= winsNeeded) {
          const won = newPlayerScore >= winsNeeded;
          if (won) {
            addGems(prev.betAmount * 2);
          }
          return {
            ...prev,
            playerScore: newPlayerScore,
            opponentScore: newOpponentScore,
            currentRound: newRound,
            status: "finished",
            result: won ? "win" : "lose",
          };
        }

        return {
          ...prev,
          playerScore: newPlayerScore,
          opponentScore: newOpponentScore,
          currentRound: newRound,
        };
      });

      setIsFlipping(false);
      setTimeout(() => setFlipResult(null), 1500);
    }, 1000);
  }, [game, isFlipping, addGems]);

  const resetGame = useCallback(() => {
    setGame(null);
    setFlipResult(null);
  }, []);

  // Auto-play rounds
  useEffect(() => {
    if (game?.status !== "playing" || isFlipping || flipResult) return;
    const timer = setTimeout(() => playRound(), 500);
    return () => clearTimeout(timer);
  }, [game, isFlipping, flipResult, playRound]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Title */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Multibattles
          </h1>
        </div>
        {!game && (
          <button
            type="button"
            onClick={createGame}
            className="rounded-xl border border-petbet-blue/30 bg-petbet-blue/10 px-6 py-2.5 font-display text-sm font-bold uppercase text-petbet-blue transition-colors hover:bg-petbet-blue/20"
          >
            Create New Game
          </button>
        )}
      </div>

      {game ? (
        <div className="rounded-xl bg-petbet-panel p-8">
          {/* Mode tabs */}
          <div className="mb-6 flex gap-2">
            {(["coinflip", "colordice", "wheel"] as GameMode[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled
                className={cn(
                  "rounded-lg px-6 py-2.5 text-sm font-bold capitalize transition-all",
                  m === game.mode
                    ? "bg-petbet-blue text-white"
                    : "bg-petbet-panel-2 text-petbet-muted",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Coin animation */}
          <div className="mb-8 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="mb-2 text-xs font-semibold uppercase text-petbet-muted">You</p>
              <div
                className={cn(
                  "flex size-20 items-center justify-center rounded-full border-4 text-3xl font-bold transition-all",
                  game.side === "heads"
                    ? "border-green-400 bg-green-400/10"
                    : "border-blue-400 bg-blue-400/10",
                )}
              >
                {game.side === "heads" ? "🟢" : "🔵"}
              </div>
              <p className="mt-2 text-sm font-bold capitalize">{game.side}</p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <AnimatePresence mode="wait">
                  {flipResult ? (
                    <motion.div
                      key={flipResult}
                      initial={{ rotateY: 180, scale: 0.5 }}
                      animate={{ rotateY: 0, scale: 1 }}
                      className={cn(
                        "flex size-16 items-center justify-center rounded-full border-4 text-2xl font-bold",
                        flipResult === "heads"
                          ? "border-green-400 bg-green-400/20"
                          : "border-blue-400 bg-blue-400/20",
                      )}
                    >
                      {flipResult === "heads" ? "🟢" : "🔵"}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="coin"
                      animate={isFlipping ? { rotateY: 360 } : {}}
                      transition={{ duration: 0.5, repeat: isFlipping ? Infinity : 0 }}
                      className="flex size-16 items-center justify-center rounded-full border-4 border-yellow-400 bg-yellow-400/20 text-2xl"
                    >
                      🪙
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-lg font-black text-white">
                {game.playerScore} — {game.opponentScore}
              </span>
              <span className="text-xs text-petbet-muted">
                Round {game.currentRound + 1} / {game.rounds}
              </span>
            </div>

            <div className="text-center">
              <p className="mb-2 text-xs font-semibold uppercase text-petbet-muted">Opponent</p>
              <div className="flex size-20 items-center justify-center rounded-full border-4 border-petbet-panel-3 bg-petbet-panel-3 text-3xl">
                🤖
              </div>
              <p className="mt-2 text-sm font-bold">
                {game.side === "heads" ? "Tails" : "Heads"}
              </p>
            </div>
          </div>

          {/* Score dots */}
          <div className="mb-6 flex justify-center gap-1.5">
            {Array.from({ length: game.rounds }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "size-3 rounded-full",
                  i < game.currentRound
                    ? i < game.playerScore
                      ? "bg-green-400"
                      : "bg-red-400"
                    : "bg-petbet-panel-3",
                )}
              />
            ))}
          </div>

          {/* Result */}
          {game.status === "finished" && (
            <div className="text-center">
              <p
                className={cn(
                  "mb-4 text-3xl font-black",
                  game.result === "win" ? "text-petbet-green" : "text-petbet-red",
                )}
              >
                {game.result === "win" ? "You Won!" : "You Lost"}
              </p>
              <button
                type="button"
                onClick={resetGame}
                className="rounded-xl bg-petbet-blue px-8 py-3 font-display text-sm font-bold uppercase text-white transition-colors hover:bg-petbet-blue-bright"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-petbet-panel p-8">
          {/* Mode tabs */}
          <div className="mb-6 flex gap-2">
            {(["coinflip", "colordice", "wheel"] as GameMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg px-6 py-2.5 text-sm font-bold capitalize transition-all",
                  m === mode
                    ? "bg-petbet-blue text-white"
                    : "bg-petbet-panel-2 text-petbet-muted hover:text-white",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Bet amount */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
              Bet Amount
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-petbet-panel-2 px-4 py-3">
              <GemDiamond className="size-4" />
              <span className="flex-1 text-lg font-bold text-white">{formatGems(betAmount)}</span>
              <button
                type="button"
                onClick={() => setBetAmount((v) => Math.max(100, Math.floor(v / 2)))}
                className="rounded-md bg-petbet-panel-3 px-2 py-1 text-xs font-bold text-white/60"
              >
                ½
              </button>
              <button
                type="button"
                onClick={() => setBetAmount((v) => v * 2)}
                className="rounded-md bg-petbet-panel-3 px-2 py-1 text-xs font-bold text-white/60"
              >
                2×
              </button>
            </div>
          </div>

          {/* Side selection (coinflip only) */}
          {mode === "coinflip" && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
                Your Side
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSide("heads")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all",
                    selectedSide === "heads"
                      ? "bg-petbet-blue text-white"
                      : "bg-petbet-panel-2 text-petbet-muted hover:text-white",
                  )}
                >
                  <span className="size-3 rounded-full bg-green-400" />
                  Heads
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSide("tails")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all",
                    selectedSide === "tails"
                      ? "bg-petbet-blue text-white"
                      : "bg-petbet-panel-2 text-petbet-muted hover:text-white",
                  )}
                >
                  <span className="size-3 rounded-full bg-blue-400" />
                  Tails
                </button>
              </div>
            </div>
          )}

          {/* Rounds */}
          <div className="mb-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
              Rounds
            </p>
            <div className="flex gap-2">
              {([1, 3, 5] as RoundMode[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRounds(r)}
                  className={cn(
                    "rounded-lg px-6 py-2.5 text-sm font-bold transition-all",
                    rounds === r
                      ? "bg-petbet-blue text-white"
                      : "bg-petbet-panel-2 text-petbet-muted hover:text-white",
                  )}
                >
                  Best of {r}
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <button
            type="button"
            onClick={createGame}
            className="w-full rounded-xl bg-petbet-blue py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-petbet-blue-bright"
          >
            Create Game
          </button>

          <p className="mt-4 text-center text-sm text-petbet-muted">
            No active games. Create one to start!
          </p>
        </div>
      )}
    </div>
  );
}
