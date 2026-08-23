/**
 * CasinoPanel — Full casino lobby with offline + online gambling games.
 * Matches the dark luxury theme with orange/red accents.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dice5, CircleDollarSign, Flame, Bomb, Trophy, Users,
  ArrowLeft, Sparkles, Target, TrendingUp, Star, Zap, Crown
} from "lucide-react";
import type { GameState } from "@/game/types";
import type { Action } from "@/game/engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────────────────── */
type GameId = "lobby" | "coinflip" | "roulette" | "slots" | "crash" | "mines" | "jackpot" | "online-coinflip" | "online-jackpot";

interface GameDef {
  id: GameId;
  name: string;
  icon: string;
  category: "game" | "online";
  desc: string;
}

const GAMES: GameDef[] = [
  { id: "coinflip", name: "Play Coinflip Offline", icon: "🪙", category: "game", desc: "Pick heads or tails" },
  { id: "roulette", name: "Play Roulette", icon: "🎯", category: "game", desc: "Bet on red, black, or green" },
  { id: "slots", name: "Play Slot Machine", icon: "🎰", category: "game", desc: "Spin to win big" },
  { id: "crash", name: "Play Crash", icon: "📈", category: "game", desc: "Cash out before it crashes" },
  { id: "mines", name: "Play Mines", icon: "💣", category: "game", desc: "Avoid the mines" },
  { id: "jackpot", name: "Play Jackpot", icon: "🎲", category: "game", desc: "Pool your bet for the big win" },
  { id: "online-coinflip", name: "Play Online Coinflip 1v1", icon: "⚔️", category: "online", desc: "Challenge another player" },
  { id: "online-jackpot", name: "Play Online Jackpot", icon: "⭐", category: "online", desc: "Pool with others · NEW!" },
];

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
            <button
              type="button"
              onClick={back}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:border-apex-red hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Back to Casino
            </button>
            {game === "coinflip" && <CoinflipGame state={state} dispatch={dispatch} />}
            {game === "roulette" && <RouletteGame state={state} dispatch={dispatch} />}
            {game === "slots" && <SlotsGame state={state} dispatch={dispatch} />}
            {game === "crash" && <CrashGame state={state} dispatch={dispatch} />}
            {game === "mines" && <MinesGame state={state} dispatch={dispatch} />}
            {game === "jackpot" && <JackpotGame state={state} dispatch={dispatch} />}
            {game === "online-coinflip" && <OnlineCoinflip state={state} dispatch={dispatch} />}
            {game === "online-jackpot" && <OnlineJackpot state={state} dispatch={dispatch} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Casino Lobby ──────────────────────────────────────────────────────── */
function CasinoLobby({ state: _state, dispatch: _dispatch, onSelect }: { state: GameState; dispatch: React.Dispatch<Action>; onSelect: (g: GameId) => void }) {
  const offline = GAMES.filter((g) => g.category === "game");
  const online = GAMES.filter((g) => g.category === "online");

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="font-display text-4xl font-black text-white tracking-tight">Casino</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Offline Games */}
        <div>
          <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-[0.25em] text-white/40">Games</p>
          <div className="space-y-2">
            {offline.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#111114] p-4 text-left transition-all hover:border-apex-red/50 hover:bg-[#161619] group"
              >
                <div className="flex size-14 items-center justify-center rounded-xl bg-white/5 text-3xl group-hover:scale-110 transition-transform">
                  {g.icon}
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-white group-hover:text-apex-red transition-colors">{g.name}</p>
                  <p className="text-xs text-white/35 mt-0.5">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Online Games */}
        <div>
          <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-[0.25em] text-white/40">Online Games</p>
          <div className="space-y-2">
            {online.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#111114] p-4 text-left transition-all hover:border-apex-red/50 hover:bg-[#161619] group"
              >
                <div className="flex size-14 items-center justify-center rounded-xl bg-white/5 text-3xl group-hover:scale-110 transition-transform">
                  {g.icon}
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-white group-hover:text-apex-red transition-colors">
                    {g.name}
                    {g.id === "online-jackpot" && (
                      <span className="ml-2 rounded bg-apex-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">NEW!</span>
                    )}
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper: Bet Input ─────────────────────────────────────────────────── */
function BetInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const presets = [100, 500, 1000, 5000, 10000];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
          className="flex-1 rounded-lg border border-white/15 bg-[#0a0a0c] px-3 py-2 text-sm font-bold text-white outline-none focus:border-apex-red"
        />
        <span className="text-xs text-white/30">/ ${max.toLocaleString()}</span>
      </div>
      <div className="flex gap-1.5">
        {presets.filter((p) => p <= max).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors",
              value === p ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            ${p >= 1000 ? `${p / 1000}K` : p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  COINFLIP                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
function CoinflipGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);

  const play = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setSpinning(true);
    setResult(null);
    setWon(null);
    setTimeout(() => {
      const r: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
      setResult(r);
      const wonGame = r === pick;
      setWon(wonGame);
      dispatch({ type: "ADD_CASH", amount: wonGame ? bet : -bet });
      setSpinning(false);
    }, 1200);
  }, [bet, pick, state.cash, dispatch]);

  return (
    <GameLayout title="Coinflip" emoji="🪙">
      <div className="flex flex-col items-center gap-6">
        {/* Coin */}
        <div className={cn(
          "size-32 rounded-full border-4 border-amber-500 flex items-center justify-center text-5xl font-bold transition-all duration-300",
          spinning ? "animate-spin" : "",
          result === "heads" ? "bg-gradient-to-br from-amber-400 to-amber-600" : result === "tails" ? "bg-gradient-to-br from-gray-300 to-gray-500" : "bg-gradient-to-br from-amber-400 to-amber-600"
        )}>
          {spinning ? "🪙" : result === "heads" ? "H" : result === "tails" ? "T" : "?"}
        </div>

        {/* Pick */}
        <div className="flex gap-3">
          {(["heads", "tails"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPick(s)}
              className={cn(
                "rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
                pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50 hover:border-white/30"
              )}
            >
              {s === "heads" ? "👑 Heads" : "🔴 Tails"}
            </button>
          ))}
        </div>

        {/* Bet */}
        <div className="w-full max-w-xs">
          <BetInput value={bet} onChange={setBet} max={state.cash} />
        </div>

        {/* Play */}
        <button
          type="button"
          onClick={play}
          disabled={spinning || state.cash < bet}
          className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
        >
          {spinning ? "Flipping..." : `Flip — $${bet.toLocaleString()}`}
        </button>

        {/* Result */}
        {won !== null && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-6 py-3 font-display text-lg font-bold",
            won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won ? `+$${bet.toLocaleString()} — ${result?.toUpperCase()}!` : `-$${bet.toLocaleString()} — ${result?.toUpperCase()}!`}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ROULETTE                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
const ROULETTE_NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function RouletteGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<"red" | "black" | "green">("red");
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);

  const spin = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setSpinning(true);
    setLanding(null);
    setWon(null);
    setTimeout(() => {
      const num = ROULETTE_NUMS[Math.floor(Math.random() * ROULETTE_NUMS.length)];
      setLanding(num);
      const color = num === 0 ? "green" : RED_NUMS.has(num) ? "red" : "black";
      const wonGame = color === pick;
      setWon(wonGame);
      const multiplier = pick === "green" ? 14 : 2;
      dispatch({ type: "ADD_CASH", amount: wonGame ? bet * (multiplier - 1) : -bet });
      setSpinning(false);
    }, 2000);
  }, [bet, pick, state.cash, dispatch]);

  return (
    <GameLayout title="Roulette" emoji="🎯">
      <div className="flex flex-col items-center gap-6">
        {/* Wheel indicator */}
        <div className={cn(
          "flex size-20 items-center justify-center rounded-full border-4 text-2xl font-black",
          spinning ? "animate-pulse border-white/30" : landing === 0 ? "border-green-500 bg-green-500/20 text-green-400" :
          landing !== null && RED_NUMS.has(landing) ? "border-red-500 bg-red-500/20 text-red-400" :
          landing !== null ? "border-white bg-white/10 text-white" : "border-white/20 text-white/30"
        )}>
          {spinning ? "..." : landing !== null ? landing : "?"}
        </div>

        {/* Bet type */}
        <div className="flex gap-2">
          {(["red", "black", "green"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPick(c)}
              className={cn(
                "rounded-xl border-2 px-6 py-3 font-display text-sm font-bold uppercase transition-all",
                pick === c
                  ? c === "red" ? "border-red-500 bg-red-500/20 text-red-400" : c === "black" ? "border-white bg-white/10 text-white" : "border-green-500 bg-green-500/20 text-green-400"
                  : "border-white/15 text-white/50 hover:border-white/30"
              )}
            >
              {c === "red" ? "🔴 Red" : c === "black" ? "⚫ Black" : "🟢 Green"}
              <span className="ml-1 text-[10px] opacity-60">×{c === "green" ? 14 : 2}</span>
            </button>
          ))}
        </div>

        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || state.cash < bet}
          className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
        >
          {spinning ? "Spinning..." : `Spin — $${bet.toLocaleString()}`}
        </button>

        {won !== null && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-6 py-3 font-display text-lg font-bold",
            won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won ? `+$${(bet * (pick === "green" ? 13 : 1)).toLocaleString()}!` : `-$${bet.toLocaleString()}!`}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SLOT MACHINE                                                             */
/* ══════════════════════════════════════════════════════════════════════════ */
const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "🔔"];
const SLOT_WEIGHTS = [25, 22, 20, 15, 10, 5, 3]; // weighted probabilities

function weightedRandom(): string {
  const total = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    r -= SLOT_WEIGHTS[i];
    if (r <= 0) return SLOT_SYMBOLS[i];
  }
  return SLOT_SYMBOLS[0];
}

function SlotsGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["?", "?", "?"]);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  const spin = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setSpinning(true);
    setWon(null);
    // Animate reels stopping one by one
    const r1 = weightedRandom();
    const r2 = weightedRandom();
    const r3 = weightedRandom();
    setTimeout(() => setReels([r1, "?", "?"]), 400);
    setTimeout(() => setReels([r1, r2, "?"]), 800);
    setTimeout(() => {
      setReels([r1, r2, r3]);
      setSpinning(false);
      // Payout
      if (r1 === r2 && r2 === r3) {
        // Triple
        const mult = r1 === "7️⃣" ? 50 : r1 === "💎" ? 25 : r1 === "🔔" ? 15 : 10;
        const win = bet * mult;
        dispatch({ type: "ADD_CASH", amount: win });
        setWon(win);
        toast.success(`JACKPOT! Triple ${r1} — +$${win.toLocaleString()}`);
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // Double
        const win = bet * 2;
        dispatch({ type: "ADD_CASH", amount: win });
        setWon(win);
      } else {
        dispatch({ type: "ADD_CASH", amount: -bet });
        setWon(-bet);
      }
    }, 1200);
  }, [bet, state.cash, dispatch]);

  return (
    <GameLayout title="Slot Machine" emoji="🎰">
      <div className="flex flex-col items-center gap-6">
        {/* Reels */}
        <div className="flex gap-3">
          {reels.map((s, i) => (
            <motion.div
              key={i}
              animate={spinning ? { y: [0, -20, 0] } : {}}
              transition={{ repeat: spinning ? Infinity : 0, duration: 0.3, delay: i * 0.1 }}
              className="flex size-24 items-center justify-center rounded-2xl border-2 border-white/20 bg-[#0a0a0c] text-5xl"
            >
              {s}
            </motion.div>
          ))}
        </div>

        {/* Payout table */}
        <div className="rounded-xl bg-white/5 px-4 py-2 text-center text-[10px] text-white/40">
          7️⃣7️⃣7️⃣ = ×50 · 💎💎💎 = ×25 · 🔔🔔🔔 = ×15 · Any triple = ×10 · Any pair = ×2
        </div>

        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || state.cash < bet}
          className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
        >
          {spinning ? "Spinning..." : `Spin — $${bet.toLocaleString()}`}
        </button>

        {won !== null && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-6 py-3 font-display text-lg font-bold",
            won > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won > 0 ? `+$${won.toLocaleString()}!` : `-$${Math.abs(won).toLocaleString()}!`}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CRASH                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
function CrashGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashedAt, setCashedAt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashPoint = useRef(0);

  const start = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    setPlaying(true);
    setCrashed(false);
    setCashedOut(false);
    setCashedAt(0);
    setMultiplier(1.0);
    // Random crash point (1.0 to 10.0x, weighted toward lower)
    crashPoint.current = Math.max(1.01, Math.pow(Math.random(), 0.7) * 10 + 1);

    let mult = 1.0;
    timerRef.current = setInterval(() => {
      mult += 0.03 + mult * 0.008;
      setMultiplier(mult);
      if (mult >= crashPoint.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCrashed(true);
        setPlaying(false);
      }
    }, 50);
  }, [bet, state.cash, dispatch]);

  const cashOut = useCallback(() => {
    if (!playing || crashed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const win = Math.floor(bet * multiplier);
    dispatch({ type: "ADD_CASH", amount: win });
    setCashedOut(true);
    setCashedAt(multiplier);
    setPlaying(false);
    toast.success(`Cashed out at ${multiplier.toFixed(2)}× — +$${win.toLocaleString()}`);
  }, [playing, crashed, bet, multiplier, dispatch]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <GameLayout title="Crash" emoji="📈">
      <div className="flex flex-col items-center gap-6">
        {/* Multiplier display */}
        <div className={cn(
          "flex h-40 w-full max-w-md items-center justify-center rounded-2xl border-2 text-6xl font-black font-mono transition-colors",
          crashed ? "border-red-500 bg-red-500/10 text-red-400" :
          cashedOut ? "border-green-500 bg-green-500/10 text-green-400" :
          playing ? "border-amber-500 bg-amber-500/10 text-amber-400" :
          "border-white/20 bg-[#0a0a0c] text-white/30"
        )}>
          {crashed ? "CRASHED" : `${multiplier.toFixed(2)}×`}
        </div>

        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        {playing ? (
          <button
            type="button"
            onClick={cashOut}
            className="rounded-xl bg-green-600 px-12 py-4 font-display text-lg font-bold uppercase tracking-wider text-white transition-all hover:bg-green-700 animate-pulse"
          >
            CASH OUT — ${(bet * multiplier).toFixed(0)}
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={state.cash < bet}
            className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
          >
            {crashed ? "Play Again" : "Start"} — ${bet.toLocaleString()}
          </button>
        )}

        {cashedOut && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl bg-green-500/20 px-6 py-3 font-display text-lg font-bold text-green-400">
            Cashed out at {cashedAt.toFixed(2)}×!
          </motion.div>
        )}
        {crashed && !cashedOut && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl bg-red-500/20 px-6 py-3 font-display text-lg font-bold text-red-400">
            Crashed at {multiplier.toFixed(2)}×! You lost ${bet.toLocaleString()}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MINES                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
function MinesGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const ROWS = 5;
  const COLS = 5;
  const [bet, setBet] = useState(100);
  const [mineCount, setMineCount] = useState(5);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1);

  const start = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    const m = new Set<number>();
    while (m.size < mineCount) m.add(Math.floor(Math.random() * ROWS * COLS));
    setMines(m);
    setRevealed(new Set());
    setPlaying(true);
    setGameOver(false);
    setWon(null);
    setCurrentMult(1);
  }, [bet, mineCount, state.cash, dispatch]);

  const reveal = useCallback((idx: number) => {
    if (!playing || revealed.has(idx)) return;
    if (mines.has(idx)) {
      // Hit a mine
      setGameOver(true);
      setPlaying(false);
      setWon(-bet);
      toast.error("BOOM! You hit a mine.");
    } else {
      const newRevealed = new Set(revealed);
      newRevealed.add(idx);
      setRevealed(newRevealed);
      const safeSpots = ROWS * COLS - mineCount;
      const mult = 1 + (newRevealed.size / safeSpots) * (mineCount * 2);
      setCurrentMult(mult);
      if (newRevealed.size === safeSpots) {
        const win = Math.floor(bet * mult);
        dispatch({ type: "ADD_CASH", amount: win });
        setPlaying(false);
        setWon(win);
        toast.success(`All clear! +$${win.toLocaleString()}`);
      }
    }
  }, [playing, revealed, mines, bet, mineCount, dispatch]);

  const cashOut = useCallback(() => {
    if (!playing || revealed.size === 0) return;
    const win = Math.floor(bet * currentMult);
    dispatch({ type: "ADD_CASH", amount: win });
    setPlaying(false);
    setWon(win);
    setGameOver(true);
  }, [playing, revealed, bet, currentMult, dispatch]);

  return (
    <GameLayout title="Mines" emoji="💣">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        {/* Mine count selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Mines:</span>
          {[3, 5, 7, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => !playing && setMineCount(n)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition-colors",
                mineCount === n ? "bg-apex-red text-white" : "bg-white/5 text-white/40"
              )}
              disabled={playing}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Board */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: ROWS * COLS }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => reveal(i)}
              disabled={!playing || revealed.has(i) || gameOver}
              className={cn(
                "flex size-14 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all",
                revealed.has(i)
                  ? mines.has(i) ? "border-red-500 bg-red-500/20 text-red-400" : "border-green-500 bg-green-500/20 text-green-400"
                  : gameOver && mines.has(i) ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : "border-white/15 bg-[#0a0a0c] hover:border-white/30 hover:bg-white/5"
              )}
            >
              {revealed.has(i) ? (mines.has(i) ? "💣" : "💎") : gameOver && mines.has(i) ? "💣" : ""}
            </button>
          ))}
        </div>

        {playing && revealed.size > 0 && (
          <button
            type="button"
            onClick={cashOut}
            className="rounded-xl bg-green-600 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-green-700"
          >
            Cash Out — ${Math.floor(bet * currentMult).toLocaleString()} ({currentMult.toFixed(2)}×)
          </button>
        )}

        {!playing && !gameOver && (
          <button
            type="button"
            onClick={start}
            disabled={state.cash < bet}
            className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
          >
            Start — ${bet.toLocaleString()}
          </button>
        )}

        {won !== null && gameOver && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-6 py-3 font-display text-lg font-bold",
            won > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won > 0 ? `+$${won.toLocaleString()}!` : `-$${Math.abs(won).toLocaleString()}!`}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  JACKPOT (offline)                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */
function JackpotGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [pool, setPool] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const join = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    setPool((p) => p + bet);
    toast.success(`Added $${bet.toLocaleString()} to the pool`);
  }, [bet, state.cash, dispatch]);

  const draw = useCallback(() => {
    if (pool === 0) return toast.error("Pool is empty!");
    setSpinning(true);
    setWinner(null);
    setTimeout(() => {
      // 60% chance player wins, 40% house
      const playerWins = Math.random() < 0.6;
      if (playerWins) {
        dispatch({ type: "ADD_CASH", amount: pool });
        setWinner("YOU WON!");
        toast.success(`JACKPOT! Won $${pool.toLocaleString()}!`);
      } else {
        setWinner("House wins");
        toast.error(`House wins $${pool.toLocaleString()}`);
      }
      setPool(0);
      setSpinning(false);
    }, 2000);
  }, [pool, dispatch]);

  return (
    <GameLayout title="Jackpot" emoji="🎲">
      <div className="flex flex-col items-center gap-6">
        {/* Pool display */}
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 px-8 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400/60">Prize Pool</p>
          <p className="font-mono text-4xl font-black text-amber-400">${pool.toLocaleString()}</p>
        </div>

        {spinning && (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-5xl">
            🎲
          </motion.div>
        )}

        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={join}
            disabled={spinning || state.cash < bet}
            className="rounded-xl border border-white/20 bg-white/5 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 disabled:opacity-40"
          >
            Add to Pool
          </button>
          <button
            type="button"
            onClick={draw}
            disabled={spinning || pool === 0}
            className="rounded-xl bg-apex-red px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40"
          >
            Draw Winner
          </button>
        </div>

        {winner && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-6 py-3 font-display text-xl font-bold",
            winner === "YOU WON!" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {winner}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE COINFLIP 1v1 (simulated)                                         */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineCoinflip({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<{ myPick: string; oppPick: string; won: boolean } | null>(null);

  const findMatch = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setFinding(true);
    setResult(null);
    dispatch({ type: "ADD_CASH", amount: -bet });
    setTimeout(() => {
      const myCoin = Math.random() < 0.5 ? "heads" : "tails";
      const oppCoin = Math.random() < 0.5 ? "heads" : "tails";
      const won = myCoin === pick;
      if (won) dispatch({ type: "ADD_CASH", amount: bet * 2 });
      setResult({ myPick: myCoin, oppPick: oppCoin, won });
      setFinding(false);
      toast[won ? "success" : "error"](won ? `Won $${bet.toLocaleString()}!` : `Lost $${bet.toLocaleString()}`);
    }, 2500);
  }, [bet, pick, state.cash, dispatch]);

  return (
    <GameLayout title="Online Coinflip 1v1" emoji="⚔️">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-3">
          {(["heads", "tails"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPick(s)} className={cn(
              "rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
              pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50"
            )}>
              {s === "heads" ? "👑 Heads" : "🔴 Tails"}
            </button>
          ))}
        </div>

        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <button
          type="button"
          onClick={findMatch}
          disabled={finding || state.cash < bet}
          className="rounded-xl bg-blue-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {finding ? "Finding opponent..." : "Find Match"}
        </button>

        {result && (
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs text-white/30">You</p>
              <p className="text-3xl">{result.myPick === "heads" ? "👑" : "🔴"}</p>
            </div>
            <div className="text-2xl font-bold text-white/30">vs</div>
            <div className="text-center">
              <p className="text-xs text-white/30">Opponent</p>
              <p className="text-3xl">{result.oppPick === "heads" ? "👑" : "🔴"}</p>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE JACKPOT (simulated)                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineJackpot({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100);
  const [players, setPlayers] = useState<{ name: string; amount: number }[]>([]);
  const [round, setRound] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const join = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    // Simulate other players
    const names = ["PHANTOM", "BLITZ", "VORTEX", "STORM", "NITRO", "APEX"];
    const opps = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
      name: names[Math.floor(Math.random() * names.length)],
      amount: Math.floor(Math.random() * 5000) + 100,
    }));
    setPlayers([...opps, { name: "YOU", amount: bet }]);
    setRound(true);
    setWinner(null);

    // Auto-draw after 5 seconds
    setTimeout(() => {
      const all = [...opps, { name: "YOU", amount: bet }];
      const total = all.reduce((s, p) => s + p.amount, 0);
      const w = all[Math.floor(Math.random() * all.length)];
      if (w.name === "YOU") {
        dispatch({ type: "ADD_CASH", amount: total });
        toast.success(`JACKPOT! Won $${total.toLocaleString()} from ${all.length} players!`);
      } else {
        toast.error(`${w.name} won the jackpot!`);
      }
      setWinner(w.name);
      setRound(false);
    }, 4000);
  }, [bet, state.cash, dispatch]);

  return (
    <GameLayout title="Online Jackpot" emoji="⭐">
      <div className="flex flex-col items-center gap-6">
        {round ? (
          <>
            <p className="font-display text-xs font-bold uppercase tracking-wider text-white/40">Players in pool</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <div key={p.name} className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold",
                  p.name === "YOU" ? "border-apex-red bg-apex-red/20 text-apex-red" : "border-white/15 bg-white/5 text-white/50"
                )}>
                  {p.name} — ${p.amount.toLocaleString()}
                </div>
              ))}
            </div>
            <div className="animate-pulse text-2xl">🎲</div>
          </>
        ) : (
          <>
            <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
            <button
              type="button"
              onClick={join}
              disabled={state.cash < bet}
              className="rounded-xl bg-purple-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-700 disabled:opacity-40"
            >
              Join Jackpot
            </button>
          </>
        )}

        {winner && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
            "rounded-xl px-8 py-4 font-display text-2xl font-bold",
            winner === "YOU" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {winner === "YOU" ? "🎉 YOU WON THE JACKPOT!" : `${winner} won!`}
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Shared layout                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
function GameLayout({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <h3 className="font-display text-xl font-black text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
