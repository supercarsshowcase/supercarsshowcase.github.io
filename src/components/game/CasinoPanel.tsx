/**
 * CasinoPanel — Full casino with chip system, car gambling, and car prizes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Zap, Target, Flame, Bomb, Trophy, Users } from "lucide-react";
import type { GameState } from "@/game/types";
import type { Action } from "@/game/engine";
import { GAME_CAR_MAP, GAME_CARS } from "@/game/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────────────────── */
type GameId = "lobby" | "coinflip" | "roulette" | "crash" | "mines" | "jackpot" | "online-coinflip" | "online-jackpot" | "trade-cars";

interface GameDef { id: GameId; name: string; icon: string; category: "game" | "online"; desc: string; }

const GAMES: GameDef[] = [
  { id: "coinflip", name: "Play Coinflip Offline", icon: "🪙", category: "game", desc: "Pick heads or tails" },
  { id: "roulette", name: "Play Roulette", icon: "🎯", category: "game", desc: "Bet on numbers, colors, or ranges" },
  { id: "crash", name: "Play Crash", icon: "📈", category: "game", desc: "Cash out before it crashes" },
  { id: "mines", name: "Play Mines", icon: "💣", category: "game", desc: "Avoid the mines" },
  { id: "jackpot", name: "Play Jackpot", icon: "🎲", category: "game", desc: "Pool cash or cars for the big win" },
  { id: "online-coinflip", name: "Play Online Coinflip 1v1", icon: "⚔️", category: "online", desc: "Challenge another player" },
  { id: "online-jackpot", name: "Play Online Jackpot", icon: "⭐", category: "online", desc: "Pool with others · NEW!" },
];

// Casino-exclusive prize cars (can only be won, not bought)
const CASINO_PRIZE_CARS = [
  { id: "casino-chiron", brand: "Bugatti", name: "Chiron Casino Edition", value: 25000000, rarity: "mythic" as const, chance: 0.005 },
  { id: "casino-sian", brand: "Lamborghini", name: "Sián Casino Special", value: 35000000, rarity: "mythic" as const, chance: 0.003 },
  { id: "casino-765lt", brand: "McLaren", name: "765LT Casino Edition", value: 8000000, rarity: "exotic" as const, chance: 0.01 },
  { id: "casino-812", brand: "Ferrari", name: "812 Casino Special", value: 12000000, rarity: "hyper" as const, chance: 0.008 },
  { id: "casino-gt-black", brand: "Mercedes-AMG", name: "GT Black Series Casino", value: 2000000, rarity: "legendary" as const, chance: 0.02 },
  { id: "casino-911-gt3", brand: "Porsche", name: "911 GT3 Casino Edition", value: 1500000, rarity: "legendary" as const, chance: 0.025 },
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
            <button type="button" onClick={back}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:border-apex-red hover:text-white">
              <ArrowLeft className="size-3.5" /> Back to Casino
            </button>
            {game === "coinflip" && <CoinflipGame state={state} dispatch={dispatch} />}
            {game === "roulette" && <RouletteGame state={state} dispatch={dispatch} />}
            {game === "crash" && <CrashGame state={state} dispatch={dispatch} />}
            {game === "mines" && <MinesGame state={state} dispatch={dispatch} />}
            {game === "jackpot" && <JackpotGame state={state} dispatch={dispatch} />}
            {game === "online-coinflip" && <OnlineCoinflip state={state} dispatch={dispatch} />}
            {game === "online-jackpot" && <OnlineJackpot state={state} dispatch={dispatch} />}
            {game === "trade-cars" && <TradeCarsPanel state={state} dispatch={dispatch} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Casino Lobby ──────────────────────────────────────────────────────── */
function CasinoLobby({ state, dispatch, onSelect }: { state: GameState; dispatch: React.Dispatch<Action>; onSelect: (g: GameId) => void }) {
  const offline = GAMES.filter((g) => g.category === "game");
  const online = GAMES.filter((g) => g.category === "online");

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="font-display text-4xl font-black text-white tracking-tight">Casino</h2>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex justify-center gap-3">
        <button type="button" onClick={() => onSelect("trade-cars")}
          className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 hover:text-white">
          Trade in Cars to Chips
        </button>
        <button type="button" onClick={() => { toast.info("Convert chips back to cash!"); dispatch({ type: "ADD_CASH", amount: 10000 }); }}
          className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 hover:text-white">
          Withdraw Chips to Cash
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-[0.25em] text-white/40">Games</p>
          <div className="space-y-2">
            {offline.map((g) => (
              <button key={g.id} type="button" onClick={() => onSelect(g.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#111114] p-4 text-left transition-all hover:border-apex-red/50 hover:bg-[#161619] group">
                <div className="flex size-14 items-center justify-center rounded-xl bg-white/5 text-3xl group-hover:scale-110 transition-transform">{g.icon}</div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-white group-hover:text-apex-red transition-colors">{g.name}</p>
                  <p className="text-xs text-white/35 mt-0.5">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-[0.25em] text-white/40">Online Games</p>
          <div className="space-y-2">
            {online.map((g) => (
              <button key={g.id} type="button" onClick={() => onSelect(g.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#111114] p-4 text-left transition-all hover:border-apex-red/50 hover:bg-[#161619] group">
                <div className="flex size-14 items-center justify-center rounded-xl bg-white/5 text-3xl group-hover:scale-110 transition-transform">{g.icon}</div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-white group-hover:text-apex-red transition-colors">
                    {g.name}
                    {g.id === "online-jackpot" && <span className="ml-2 rounded bg-apex-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">NEW!</span>}
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

/* ── Trade Cars Panel ──────────────────────────────────────────────────── */
function TradeCarsPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const ownedCars = useMemo(() =>
    Object.keys(state.ownedCars).map((id) => GAME_CAR_MAP[id]).filter(Boolean).filter((c) => c.id !== state.activeCarId),
    [state.ownedCars, state.activeCarId]
  );

  const trade = (carId: string) => {
    const car = GAME_CAR_MAP[carId];
    if (!car) return;
    const chipValue = Math.floor(car.value * 0.7); // 70% value as chips
    dispatch({ type: "REMOVE_CAR", carId });
    dispatch({ type: "ADD_CASH", amount: chipValue });
    toast.success(`Traded ${car.name} for $${chipValue.toLocaleString()} cash!`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
      <h3 className="mb-2 font-display text-xl font-black text-white">Trade Cars for Cash</h3>
      <p className="mb-4 text-xs text-white/40">Sell your cars at 70% market value to fund your casino games.</p>
      {ownedCars.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/30">No cars to trade.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
          {ownedCars.map((car) => (
            <div key={car.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0a0c] p-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-white">{car.brand} {car.name}</p>
                <p className="text-[10px] text-white/30">${Math.floor(car.value * 0.7).toLocaleString()} chips</p>
              </div>
              <button type="button" onClick={() => trade(car.id)}
                className="shrink-0 rounded-lg bg-apex-red/80 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-apex-red">
                Trade
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helper: Bet Input ─────────────────────────────────────────────────── */
function BetInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const presets = [1000, 10000, 100000, 1000000, 10000000];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, Math.floor(value / 2)))}
          className="rounded-md bg-white/5 px-3 py-2 text-xs font-bold text-white/50 hover:bg-white/10">½ &lt;--</button>
        <input type="number" value={value} onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
          className="flex-1 rounded-lg border border-white/15 bg-[#0a0a0c] px-3 py-2 text-sm font-bold text-white text-center outline-none focus:border-apex-red" />
        <button type="button" onClick={() => onChange(Math.min(max, value * 2))}
          className="rounded-md bg-white/5 px-3 py-2 text-xs font-bold text-white/50 hover:bg-white/10">--&gt; 2×</button>
      </div>
      <div className="flex gap-1.5">
        {presets.filter((p) => p <= max).slice(0, 5).map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className={cn("rounded-md px-2 py-1 text-[10px] font-bold transition-colors", value === p ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
            {p >= 1000000 ? `${(p / 1000000).toFixed(0)}M` : p >= 1000 ? `${(p / 1000).toFixed(0)}K` : p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Helper: Check for casino car prize ────────────────────────────────── */
function checkCasinoPrize(dispatch: React.Dispatch<Action>): string | null {
  for (const prize of CASINO_PRIZE_CARS) {
    if (Math.random() < prize.chance) {
      dispatch({ type: "ADD_CAR", carId: prize.id });
      return `${prize.brand} ${prize.name}!`;
    }
  }
  return null;
}

/* ── Helper: GameLayout ────────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════ */
/*  COINFLIP                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
function CoinflipGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(1000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);

  const play = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setSpinning(true); setResult(null); setWon(null); setCarPrize(null);
    setTimeout(() => {
      const r: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
      setResult(r);
      const wonGame = r === pick;
      setWon(wonGame);
      if (wonGame) {
        dispatch({ type: "ADD_CASH", amount: bet });
        const prize = checkCasinoPrize(dispatch);
        if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
      } else {
        dispatch({ type: "ADD_CASH", amount: -bet });
      }
      setSpinning(false);
    }, 1200);
  }, [bet, pick, state.cash, dispatch]);

  return (
    <GameLayout title="Coinflip" emoji="🪙">
      <div className="flex flex-col items-center gap-6">
        <div className={cn("size-32 rounded-full border-4 border-amber-500 flex items-center justify-center text-5xl font-bold transition-all",
          spinning ? "animate-spin" : result === "heads" ? "bg-gradient-to-br from-amber-400 to-amber-600" : result === "tails" ? "bg-gradient-to-br from-gray-300 to-gray-500" : "bg-gradient-to-br from-amber-400 to-amber-600"
        )}>
          {spinning ? "🪙" : result === "heads" ? "H" : result === "tails" ? "T" : "?"}
        </div>
        <div className="flex gap-3">
          {(["heads", "tails"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPick(s)} className={cn(
              "rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
              pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50 hover:border-white/30"
            )}>{s === "heads" ? "👑 Heads" : "🔴 Tails"}</button>
          ))}
        </div>
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <button type="button" onClick={play} disabled={spinning || state.cash < bet}
          className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40">
          {spinning ? "Flipping..." : `Flip — $${bet.toLocaleString()}`}
        </button>
        {won !== null && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-xl px-6 py-3 font-display text-lg font-bold",
            won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won ? `+$${bet.toLocaleString()} — ${result?.toUpperCase()}!` : `-$${bet.toLocaleString()} — ${result?.toUpperCase()}!`}
          </motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ROULETTE — Full grid like the screenshot                                */
/* ══════════════════════════════════════════════════════════════════════════ */
const ROULETTE_NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const GRID_ROWS = [[3,6,9,12,15,18,21,24,27,30,33,36],[2,5,8,11,14,17,20,23,26,29,32,35],[1,4,7,10,13,16,19,22,25,28,31,34]];

type BetType = { kind: "number"; value: number } | { kind: "color"; value: "red" | "black" | "green" } | { kind: "range"; value: "1-18" | "19-36" | "1st" | "2nd" | "3rd" } | { kind: "parity"; value: "even" | "odd" };

function RouletteGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(10000);
  const [currentBet, setCurrentBet] = useState<BetType | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const [wheelOffset, setWheelOffset] = useState(0);

  const placeBet = (b: BetType) => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setCurrentBet(b);
  };

  const spin = useCallback(() => {
    if (!currentBet) return toast.error("Place a bet first!");
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    setSpinning(true); setWon(null); setCarPrize(null);
    setTimeout(() => {
      const num = ROULETTE_NUMS[Math.floor(Math.random() * ROULETTE_NUMS.length)];
      setLanding(num);
      const color = num === 0 ? "green" : RED_NUMS.has(num) ? "red" : "black";
      let wonGame = false;
      let multiplier = 0;
      const b = currentBet!;
      if (b.kind === "number" && b.value === num) { wonGame = true; multiplier = 36; }
      else if (b.kind === "color" && b.value === color) { wonGame = true; multiplier = color === "green" ? 14 : 2; }
      else if (b.kind === "parity") {
        if (b.value === "even" && num !== 0 && num % 2 === 0) { wonGame = true; multiplier = 2; }
        if (b.value === "odd" && num % 2 === 1) { wonGame = true; multiplier = 2; }
      }
      else if (b.kind === "range") {
        if (b.value === "1-18" && num >= 1 && num <= 18) { wonGame = true; multiplier = 2; }
        if (b.value === "19-36" && num >= 19) { wonGame = true; multiplier = 2; }
        if (b.value === "1st" && num >= 1 && num <= 12) { wonGame = true; multiplier = 3; }
        if (b.value === "2nd" && num >= 13 && num <= 24) { wonGame = true; multiplier = 3; }
        if (b.value === "3rd" && num >= 25 && num <= 36) { wonGame = true; multiplier = 3; }
      }
      setWon(wonGame);
      const winAmt = wonGame ? bet * multiplier : 0;
      setWinAmount(winAmt);
      if (wonGame) {
        dispatch({ type: "ADD_CASH", amount: winAmt });
        const prize = checkCasinoPrize(dispatch);
        if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
      }
      setSpinning(false);
    }, 2500);
  }, [bet, currentBet, state.cash, dispatch]);

  const numColor = (n: number) => n === 0 ? "bg-green-600" : RED_NUMS.has(n) ? "bg-red-600" : "bg-gray-800";

  return (
    <GameLayout title="Roulette" emoji="🎯">
      <div className="flex flex-col items-center gap-4">
        {/* Bet amount */}
        <BetInput value={bet} onChange={setBet} max={state.cash} />

        {/* Wheel strip */}
        <div className="relative w-full overflow-hidden h-16 rounded-xl">
          <motion.div animate={spinning ? { x: [-wheelOffset, -wheelOffset - 2000] } : {}}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute top-0 left-0 flex gap-1">
            {[...ROULETTE_NUMS, ...ROULETTE_NUMS, ...ROULETTE_NUMS].map((n, i) => (
              <div key={i} className={cn("flex size-12 items-center justify-center rounded-full text-xs font-bold text-white", numColor(n))}>{n}</div>
            ))}
          </motion.div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-white z-10" />
        </div>

        {/* Result */}
        {landing !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={cn("flex size-14 items-center justify-center rounded-full text-lg font-black text-white border-2", numColor(landing), "border-white")}>
            {landing}
          </motion.div>
        )}

        {/* Number grid */}
        <div className="overflow-x-auto w-full max-w-2xl">
          <div className="flex gap-1 mb-1">
            <button type="button" onClick={() => placeBet({ kind: "number", value: 0 })}
              className={cn("size-10 rounded-lg text-xs font-bold text-white border transition-all", numColor(0), currentBet?.kind === "number" && currentBet.value === 0 ? "ring-2 ring-amber-400" : "border-white/20")}>0</button>
          </div>
          {GRID_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1">
              {row.map((n) => (
                <button key={n} type="button" onClick={() => placeBet({ kind: "number", value: n })}
                  className={cn("size-10 rounded-lg text-xs font-bold text-white border transition-all",
                    numColor(n), currentBet?.kind === "number" && currentBet.value === n ? "ring-2 ring-amber-400" : "border-white/20 hover:ring-2 hover:ring-white/30"
                  )}>{n}</button>
              ))}
              <button type="button" onClick={() => placeBet({ kind: "range", value: ri === 0 ? "3rd" : ri === 1 ? "2nd" : "1st" })}
                className={cn("w-14 rounded-lg text-[10px] font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20")}>2 to 1</button>
            </div>
          ))}
          {/* Bottom row: doznes */}
          <div className="flex gap-1 mb-1">
            {[{ l: "1st 12", v: "1st" as const }, { l: "2nd 12", v: "2nd" as const }, { l: "3rd 12", v: "3rd" as const }].map((d) => (
              <button key={d.v} type="button" onClick={() => placeBet({ kind: "range", value: d.v })}
                className={cn("flex-1 h-8 rounded-lg text-[10px] font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20")}>{d.l}</button>
            ))}
          </div>
          {/* Bottom row: even/odd/color/etc */}
          <div className="flex gap-1">
            {[
              { l: "1-18", b: { kind: "range" as const, value: "1-18" as const } },
              { l: "EVEN", b: { kind: "parity" as const, value: "even" as const } },
              { l: "🔴 RED", b: { kind: "color" as const, value: "red" as const }, cls: "bg-red-600 hover:bg-red-700" },
              { l: "⚫ BLACK", b: { kind: "color" as const, value: "black" as const }, cls: "bg-gray-800 hover:bg-gray-700" },
              { l: "ODD", b: { kind: "parity" as const, value: "odd" as const } },
              { l: "19-36", b: { kind: "range" as const, value: "19-36" as const } },
            ].map((opt) => (
              <button key={opt.l} type="button" onClick={() => placeBet(opt.b)}
                className={cn("flex-1 h-8 rounded-lg text-[10px] font-bold text-white border border-white/20 transition-all",
                  opt.cls ?? "bg-white/10 hover:bg-white/20",
                  JSON.stringify(currentBet) === JSON.stringify(opt.b) && "ring-2 ring-amber-400"
                )}>{opt.l}</button>
            ))}
          </div>
        </div>

        {/* Current bet display */}
        {currentBet && <p className="text-xs text-white/40">Bet: ${bet.toLocaleString()} on {JSON.stringify(currentBet.value)}</p>}

        {/* Spin button */}
        <button type="button" onClick={spin} disabled={spinning || !currentBet || state.cash < bet}
          className="w-full max-w-md rounded-xl bg-apex-red py-4 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40">
          {spinning ? "Spinning..." : "Bet"}
        </button>

        {/* Result */}
        {won !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-xl px-6 py-3 font-display text-lg font-bold",
            won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {won ? `+$${winAmount.toLocaleString()}!` : `-$${bet.toLocaleString()}!`}
          </motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
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
  const [bet, setBet] = useState(10000);
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashedAt, setCashedAt] = useState(0);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashPoint = useRef(0);

  const start = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    setPlaying(true); setCrashed(false); setCashedOut(false); setCashedAt(0); setCarPrize(null);
    setMultiplier(1.0);
    crashPoint.current = Math.max(1.01, Math.pow(Math.random(), 0.7) * 10 + 1);
    let mult = 1.0;
    timerRef.current = setInterval(() => {
      mult += 0.03 + mult * 0.008;
      setMultiplier(mult);
      if (mult >= crashPoint.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCrashed(true); setPlaying(false);
      }
    }, 50);
  }, [bet, state.cash, dispatch]);

  const cashOut = useCallback(() => {
    if (!playing || crashed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const win = Math.floor(bet * multiplier);
    dispatch({ type: "ADD_CASH", amount: win });
    setCashedOut(true); setCashedAt(multiplier); setPlaying(false);
    const prize = checkCasinoPrize(dispatch);
    if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
    toast.success(`Cashed out at ${multiplier.toFixed(2)}× — +$${win.toLocaleString()}`);
  }, [playing, crashed, bet, multiplier, dispatch]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <GameLayout title="Crash" emoji="📈">
      <div className="flex flex-col items-center gap-6">
        <div className={cn("flex h-40 w-full max-w-md items-center justify-center rounded-2xl border-2 text-6xl font-black font-mono transition-colors",
          crashed ? "border-red-500 bg-red-500/10 text-red-400" : cashedOut ? "border-green-500 bg-green-500/10 text-green-400" : playing ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/20 bg-[#0a0a0c] text-white/30"
        )}>
          {crashed ? "CRASHED" : `${multiplier.toFixed(2)}×`}
        </div>
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        {playing ? (
          <button type="button" onClick={cashOut}
            className="rounded-xl bg-green-600 px-12 py-4 font-display text-lg font-bold uppercase tracking-wider text-white transition-all hover:bg-green-700 animate-pulse">
            CASH OUT — ${(bet * multiplier).toFixed(0)}
          </button>
        ) : (
          <button type="button" onClick={start} disabled={state.cash < bet}
            className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40">
            {crashed ? "Play Again" : "Start"} — ${bet.toLocaleString()}
          </button>
        )}
        {cashedOut && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl bg-green-500/20 px-6 py-3 font-display text-lg font-bold text-green-400">Cashed out at {cashedAt.toFixed(2)}×!</motion.div>}
        {crashed && !cashedOut && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl bg-red-500/20 px-6 py-3 font-display text-lg font-bold text-red-400">Crashed at {multiplier.toFixed(2)}×!</motion.div>}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
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
  const ROWS = 5, COLS = 5;
  const [bet, setBet] = useState(10000);
  const [mineCount, setMineCount] = useState(5);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [carPrize, setCarPrize] = useState<string | null>(null);

  const start = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    const m = new Set<number>(); while (m.size < mineCount) m.add(Math.floor(Math.random() * ROWS * COLS));
    setMines(m); setRevealed(new Set()); setPlaying(true); setGameOver(false); setWon(null); setCurrentMult(1); setCarPrize(null);
  }, [bet, mineCount, state.cash, dispatch]);

  const reveal = useCallback((idx: number) => {
    if (!playing || revealed.has(idx)) return;
    if (mines.has(idx)) { setGameOver(true); setPlaying(false); setWon(-bet); toast.error("BOOM!"); }
    else {
      const nr = new Set(revealed); nr.add(idx); setRevealed(nr);
      const safe = ROWS * COLS - mineCount;
      const mult = 1 + (nr.size / safe) * (mineCount * 2);
      setCurrentMult(mult);
      if (nr.size === safe) {
        const win = Math.floor(bet * mult); dispatch({ type: "ADD_CASH", amount: win });
        setPlaying(false); setWon(win); toast.success(`All clear! +$${win.toLocaleString()}`);
        const prize = checkCasinoPrize(dispatch);
        if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
      }
    }
  }, [playing, revealed, mines, bet, mineCount, dispatch]);

  const cashOut = useCallback(() => {
    if (!playing || revealed.size === 0) return;
    const win = Math.floor(bet * currentMult); dispatch({ type: "ADD_CASH", amount: win });
    setPlaying(false); setWon(win); setGameOver(true);
  }, [playing, revealed, bet, currentMult, dispatch]);

  return (
    <GameLayout title="Mines" emoji="💣">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Mines:</span>
          {[3, 5, 7, 10].map((n) => (
            <button key={n} type="button" onClick={() => !playing && setMineCount(n)} disabled={playing}
              className={cn("rounded-md px-3 py-1 text-xs font-bold transition-colors", mineCount === n ? "bg-apex-red text-white" : "bg-white/5 text-white/40")}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: ROWS * COLS }, (_, i) => (
            <button key={i} type="button" onClick={() => reveal(i)} disabled={!playing || revealed.has(i) || gameOver}
              className={cn("flex size-14 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all",
                revealed.has(i) ? mines.has(i) ? "border-red-500 bg-red-500/20 text-red-400" : "border-green-500 bg-green-500/20 text-green-400"
                : gameOver && mines.has(i) ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-white/15 bg-[#0a0a0c] hover:border-white/30"
              )}>
              {revealed.has(i) ? (mines.has(i) ? "💣" : "💎") : gameOver && mines.has(i) ? "💣" : ""}
            </button>
          ))}
        </div>
        {playing && revealed.size > 0 && (
          <button type="button" onClick={cashOut}
            className="rounded-xl bg-green-600 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-green-700">
            Cash Out — ${Math.floor(bet * currentMult).toLocaleString()} ({currentMult.toFixed(2)}×)
          </button>
        )}
        {!playing && !gameOver && (
          <button type="button" onClick={start} disabled={state.cash < bet}
            className="rounded-xl bg-apex-red px-12 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40">
            Start — ${bet.toLocaleString()}
          </button>
        )}
        {won !== null && gameOver && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-xl px-6 py-3 font-display text-lg font-bold",
            won > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>{won > 0 ? `+$${won.toLocaleString()}!` : `-$${Math.abs(won).toLocaleString()}!`}</motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  JACKPOT — Clear pool display, car gambling, million-dollar bets          */
/* ══════════════════════════════════════════════════════════════════════════ */
function JackpotGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100000);
  const [pool, setPool] = useState<{ type: "cash" | "car"; value: number; label: string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);

  const totalPool = pool.reduce((s, p) => s + p.value, 0);

  const addCash = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    setPool((p) => [...p, { type: "cash", value: bet, label: `$${bet.toLocaleString()}` }]);
    toast.success(`Added $${bet.toLocaleString()} to the pool`);
  }, [bet, state.cash, dispatch]);

  const addCar = useCallback(() => {
    const cars = Object.keys(state.ownedCars).filter((id) => id !== state.activeCarId).map((id) => GAME_CAR_MAP[id]).filter(Boolean);
    if (cars.length === 0) return toast.error("No cars to gamble!");
    // Pick a random car
    const car = cars[Math.floor(Math.random() * cars.length)];
    dispatch({ type: "REMOVE_CAR", carId: car.id });
    setPool((p) => [...p, { type: "car", value: car.value, label: `${car.brand} ${car.name}` }]);
    toast.success(`Added ${car.brand} ${car.name} ($${car.value.toLocaleString()}) to pool`);
  }, [state.ownedCars, state.activeCarId, dispatch]);

  const draw = useCallback(() => {
    if (pool.length === 0) return toast.error("Pool is empty!");
    setSpinning(true); setWinner(null); setCarPrize(null);
    setTimeout(() => {
      // 55% player wins
      const playerWins = Math.random() < 0.55;
      if (playerWins) {
        dispatch({ type: "ADD_CASH", amount: totalPool });
        setWinner("YOU WON THE JACKPOT!");
        // Casino car prize on jackpot win
        const prize = checkCasinoPrize(dispatch);
        if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
      } else {
        setWinner("House wins the jackpot");
      }
      setPool([]); setSpinning(false);
    }, 3000);
  }, [pool, totalPool, dispatch]);

  return (
    <GameLayout title="Jackpot" emoji="🎲">
      <div className="flex flex-col items-center gap-6">
        {/* Pool display */}
        <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-6">
          <div className="text-center mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400/60">Prize Pool</p>
            <p className="font-mono text-4xl font-black text-amber-400">${totalPool.toLocaleString()}</p>
          </div>
          {pool.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pool.map((p, i) => (
                <div key={i} className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold",
                  p.type === "car" ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-white/60"
                )}>
                  <span>{p.type === "car" ? "🚗" : "💵"} {p.label}</span>
                  <span>${p.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {spinning && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-5xl">🎲</motion.div>}

        {/* Bet controls */}
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <div className="flex gap-3">
          <button type="button" onClick={addCash} disabled={spinning || state.cash < bet}
            className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 disabled:opacity-40">
            💵 Add Cash
          </button>
          <button type="button" onClick={addCar} disabled={spinning}
            className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-purple-400 transition-all hover:bg-purple-500/20 disabled:opacity-40">
            🚗 Gamble Car
          </button>
          <button type="button" onClick={draw} disabled={spinning || pool.length === 0}
            className="rounded-xl bg-apex-red px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 disabled:opacity-40">
            Draw Winner
          </button>
        </div>

        {winner && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-xl px-8 py-4 font-display text-xl font-bold",
            winner.includes("YOU") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>{winner}</motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE COINFLIP 1v1                                                      */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineCoinflip({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<{ myPick: string; oppPick: string; won: boolean } | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);

  const findMatch = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    setFinding(true); setResult(null); setCarPrize(null);
    dispatch({ type: "ADD_CASH", amount: -bet });
    setTimeout(() => {
      const won = Math.random() < 0.5;
      if (won) { dispatch({ type: "ADD_CASH", amount: bet * 2 });
        const prize = checkCasinoPrize(dispatch);
        if (prize) { setCarPrize(prize); toast.success(`🎰 CASINO PRIZE: ${prize}`); }
      }
      setResult({ myPick: won ? pick : (pick === "heads" ? "tails" : "heads"), oppPick: Math.random() < 0.5 ? "heads" : "tails", won });
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
            )}>{s === "heads" ? "👑 Heads" : "🔴 Tails"}</button>
          ))}
        </div>
        <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <button type="button" onClick={findMatch} disabled={finding || state.cash < bet}
          className="rounded-xl bg-blue-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-40">
          {finding ? "Finding opponent..." : "Find Match"}
        </button>
        {result && (
          <div className="flex gap-6">
            <div className="text-center"><p className="text-xs text-white/30">You</p><p className="text-3xl">{result.myPick === "heads" ? "👑" : "🔴"}</p></div>
            <div className="text-2xl font-bold text-white/30">vs</div>
            <div className="text-center"><p className="text-xs text-white/30">Opponent</p><p className="text-3xl">{result.oppPick === "heads" ? "👑" : "🔴"}</p></div>
          </div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE!</p>
            <p className="mt-1 font-display text-lg font-black text-white">{carPrize}</p>
          </motion.div>
        )}
      </div>
    </GameLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ONLINE JACKPOT                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function OnlineJackpot({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [bet, setBet] = useState(100000);
  const [players, setPlayers] = useState<{ name: string; amount: number }[]>([]);
  const [round, setRound] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const join = useCallback(() => {
    if (state.cash < bet) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -bet });
    const names = ["PHANTOM", "BLITZ", "VORTEX", "STORM", "NITRO", "APEX", "DRIFT", "HEX"];
    const opps = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => ({
      name: names[Math.floor(Math.random() * names.length)], amount: Math.floor(Math.random() * 1000000) + 10000,
    }));
    setPlayers([...opps, { name: "YOU", amount: bet }]); setRound(true); setWinner(null);
    setTimeout(() => {
      const all = [...opps, { name: "YOU", amount: bet }];
      const total = all.reduce((s, p) => s + p.amount, 0);
      const w = all[Math.floor(Math.random() * all.length)];
      if (w.name === "YOU") {
        dispatch({ type: "ADD_CASH", amount: total });
        toast.success(`JACKPOT! Won $${total.toLocaleString()}!`);
      } else { toast.error(`${w.name} won $${total.toLocaleString()}`); }
      setWinner(w.name); setRound(false);
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
                <div key={p.name} className={cn("rounded-lg border px-3 py-2 text-xs font-bold",
                  p.name === "YOU" ? "border-apex-red bg-apex-red/20 text-apex-red" : "border-white/15 bg-white/5 text-white/50"
                )}>{p.name} — ${p.amount.toLocaleString()}</div>
              ))}
            </div>
            <div className="animate-pulse text-2xl">🎲</div>
          </>
        ) : (
          <>
            <div className="w-full max-w-xs"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
            <button type="button" onClick={join} disabled={state.cash < bet}
              className="rounded-xl bg-purple-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-700 disabled:opacity-40">
              Join Jackpot
            </button>
          </>
        )}
        {winner && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-xl px-8 py-4 font-display text-2xl font-bold",
            winner === "YOU" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>{winner === "YOU" ? "🎉 YOU WON THE JACKPOT!" : `${winner} won!`}</motion.div>
        )}
      </div>
    </GameLayout>
  );
}
