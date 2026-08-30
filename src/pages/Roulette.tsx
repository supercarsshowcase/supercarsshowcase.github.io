import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGems, formatGems } from "@/context/gem-context";
import { GemDiamond } from "@/components/GemDiamond";
import { cn } from "@/lib/utils";

type RouletteColor = "grey" | "green" | "blue";

interface HistoryEntry {
  color: RouletteColor;
  value: number;
}

const COLOR_MAP: Record<RouletteColor, { bg: string; text: string; label: string; multiplier: number }> = {
  grey: { bg: "bg-gray-500", text: "text-white", label: "GREY", multiplier: 2 },
  green: { bg: "bg-green-500", text: "text-white", label: "GREEN", multiplier: 3 },
  blue: { bg: "bg-blue-500", text: "text-white", label: "BLUE", multiplier: 2 },
};

function generateHistory(count: number): HistoryEntry[] {
  const colors: RouletteColor[] = ["grey", "grey", "grey", "grey", "green", "blue", "blue", "blue", "blue", "blue"];
  return Array.from({ length: count }, () => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const value = Math.floor(Math.random() * 50) + 1;
    return { color, value };
  });
}

export default function Roulette() {
  const { gems, addGems, spendGems } = useGems();
  const [betAmount, setBetAmount] = useState(20_000_000);
  const [selectedColor, setSelectedColor] = useState<RouletteColor | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => generateHistory(20));
  const [timer, setTimer] = useState(20);
  const [betPlaced, setBetPlaced] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // New round
          if (betPlaced && selectedColor) {
            const newHistory = generateHistory(1);
            const won = newHistory[0].color === selectedColor;
            if (won) {
              const winnings = betAmount * COLOR_MAP[selectedColor].multiplier;
              addGems(winnings);
              setLastWin(winnings);
            } else {
              setLastWin(-betAmount);
            }
            setHistory((h) => [...newHistory, ...h].slice(0, 20));
          }
          setBetPlaced(false);
          setSpinning(false);
          return 20;
        }
        if (prev === 5) {
          setSpinning(true);
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [betPlaced, selectedColor, betAmount, addGems]);

  const placeBet = useCallback(
    (color: RouletteColor) => {
      if (timer <= 5 || betPlaced) return;
      if (!spendGems(betAmount)) return;
      setSelectedColor(color);
      setBetPlaced(true);
      setLastWin(null);
    },
    [timer, betPlaced, spendGems, betAmount],
  );

  const recentColors = history.slice(0, 10);

  const stats = {
    grey: history.filter((h) => h.color === "grey").length,
    green: history.filter((h) => h.color === "green").length,
    blue: history.filter((h) => h.color === "blue").length,
    total: history.length,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 font-display text-3xl font-black uppercase tracking-tight">
        Roulette
      </h1>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-petbet-panel-2">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-petbet-blue to-petbet-blue-bright"
          animate={{ width: `${(timer / 20) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Ticker display */}
      <div className="mb-4 overflow-hidden rounded-xl bg-petbet-panel p-4">
        <div className="flex gap-3">
          {history.slice(0, 10).map((entry, i) => (
            <motion.div
              key={`${i}-${entry.color}`}
              initial={i === 0 ? { x: 100, opacity: 0 } : false}
              animate={{ x: 0, opacity: 1 }}
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                COLOR_MAP[entry.color].bg,
                COLOR_MAP[entry.color].text,
              )}
            >
              {entry.value}
            </motion.div>
          ))}
        </div>
        {/* Yellow line indicator */}
        <div className="relative mt-[-68px] ml-[calc(50%-2px)] h-[68px] w-[4px] rounded bg-yellow-400" />
      </div>

      {/* Stats and timer */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <span className="text-white/60">
            {stats.grey} ({((stats.grey / stats.total) * 100).toFixed(0)}%)
          </span>
          <span className="text-green-400">
            {stats.green} ({((stats.green / stats.total) * 100).toFixed(0)}%)
          </span>
          <span className="text-blue-400">
            {stats.blue} ({((stats.blue / stats.total) * 100).toFixed(0)}%)
          </span>
        </div>
        <span className="font-display text-2xl font-black text-white">
          {timer.toFixed(1)}s
        </span>
        <div className="flex gap-1">
          {recentColors.slice(0, 8).map((entry, i) => (
            <div
              key={i}
              className={cn("size-3 rounded-full", COLOR_MAP[entry.color].bg)}
            />
          ))}
        </div>
      </div>

      {/* Bet amount input */}
      <div className="mb-4 rounded-xl bg-petbet-panel p-4">
        <div className="flex items-center gap-2 rounded-lg bg-petbet-panel-2 px-4 py-3">
          <GemDiamond className="size-4" />
          <input
            type="text"
            value={formatGems(betAmount)}
            readOnly
            className="flex-1 bg-transparent text-lg font-bold text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setBetAmount((v) => Math.max(100, Math.floor(v / 2)))}
            className="rounded-md bg-petbet-panel-3 px-2 py-1 text-xs font-bold text-white/60 hover:text-white"
          >
            ½
          </button>
          <button
            type="button"
            onClick={() => setBetAmount((v) => v * 2)}
            className="rounded-md bg-petbet-panel-3 px-2 py-1 text-xs font-bold text-white/60 hover:text-white"
          >
            2×
          </button>
          <button
            type="button"
            onClick={() => setBetAmount(gems)}
            className="rounded-md bg-petbet-panel-3 px-2 py-1 text-xs font-bold text-white/60 hover:text-white"
          >
            Max
          </button>
        </div>
      </div>

      {/* Color bet buttons */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {(Object.keys(COLOR_MAP) as RouletteColor[]).map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => placeBet(color)}
            disabled={spinning || betPlaced}
            className={cn(
              "rounded-xl py-4 text-left font-display text-lg font-black uppercase transition-all",
              COLOR_MAP[color].bg,
              COLOR_MAP[color].text,
              selectedColor === color && "ring-2 ring-white ring-offset-2 ring-offset-petbet-ink",
              (spinning || betPlaced) && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-center justify-between px-4">
              <span>{COLOR_MAP[color].label}</span>
              <span className="text-sm">{COLOR_MAP[color].multiplier}×</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bets columns */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(COLOR_MAP) as RouletteColor[]).map((color) => (
          <div key={color} className="rounded-xl bg-petbet-panel p-4">
            <h3 className="mb-3 font-display text-sm font-bold uppercase text-white/60">
              Bets
            </h3>
            <div className="min-h-[80px]">
              {selectedColor === color && betPlaced && (
                <div className="flex items-center justify-between rounded-lg bg-petbet-panel-2 px-3 py-2">
                  <span className="text-xs text-white/70">You</span>
                  <span className="text-xs font-bold text-petbet-gem">
                    {formatGems(betAmount)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-petbet-line pt-3 text-xs">
              <span className="text-petbet-muted">Total</span>
              <span className="font-bold text-petbet-gem">
                {selectedColor === color && betPlaced ? formatGems(betAmount) : "0"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Last result */}
      <AnimatePresence>
        {lastWin !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 rounded-xl px-6 py-3 font-display text-lg font-bold",
              lastWin > 0
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30",
            )}
          >
            {lastWin > 0
              ? `You won ${formatGems(lastWin)} gems!`
              : `You lost ${formatGems(Math.abs(lastWin))} gems`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
