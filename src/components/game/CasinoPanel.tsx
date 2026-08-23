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
  // ── Billions (ultra-rare 0.01% – 0.1%) ──
  { id: "casino-infinity", brand: "One-off", name: "Infinity One Casino", value: 1000000000, rarity: "ultimate" as const, chance: 0.0001 },
  { id: "casino-crystal", brand: "One-off", name: "Crystal Edition Casino", value: 500000000, rarity: "ultimate" as const, chance: 0.0002 },
  { id: "casino-boat-tail", brand: "Rolls-Royce", name: "Boat Tail Casino Edition", value: 200000000, rarity: "ultimate" as const, chance: 0.0005 },
  { id: "casino-noire", brand: "Bugatti", name: "La Voiture Noire Casino", value: 100000000, rarity: "ultimate" as const, chance: 0.001 },
  { id: "casino-imola", brand: "Pagani", name: "Imola Casino Edition", value: 65000000, rarity: "mythic" as const, chance: 0.002 },
  // ── Tens of millions (0.01% – 0.1%) ──
  { id: "casino-jesko", brand: "Koenigsegg", name: "Jesko Absolut Casino", value: 48000000, rarity: "mythic" as const, chance: 0.001 },
  { id: "casino-tourbillon", brand: "Bugatti", name: "Tourbillon Casino Edition", value: 42000000, rarity: "mythic" as const, chance: 0.002 },
  { id: "casino-sian", brand: "Lamborghini", name: "Sián Casino Special", value: 35000000, rarity: "mythic" as const, chance: 0.003 },
  { id: "casino-chiron-super", brand: "Bugatti", name: "Chiron Super Sport Casino", value: 30000000, rarity: "mythic" as const, chance: 0.004 },
  { id: "casino-chiron", brand: "Bugatti", name: "Chiron Casino Edition", value: 25000000, rarity: "mythic" as const, chance: 0.005 },
  { id: "casino-nevera", brand: "Rimac", name: "Nevera Casino Edition", value: 22000000, rarity: "mythic" as const, chance: 0.005 },
  { id: "casino-agera", brand: "Koenigsegg", name: "Agera RS Casino", value: 18000000, rarity: "mythic" as const, chance: 0.006 },
  { id: "casino-revuelto", brand: "Lamborghini", name: "Revuelto Casino Edition", value: 12500000, rarity: "hyper" as const, chance: 0.008 },
  { id: "casino-812", brand: "Ferrari", name: "812 Casino Special", value: 12000000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-daytona", brand: "Ferrari", name: "Daytona SP3 Casino", value: 10000000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-one", brand: "Mercedes-AMG", name: "Project ONE Casino", value: 9000000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-veneno", brand: "Lamborghini", name: "Veneno Casino Edition", value: 8400000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-765lt", brand: "McLaren", name: "765LT Casino Edition", value: 8000000, rarity: "exotic" as const, chance: 0.01 },
  // ── Millions (0.1%) ──
  { id: "casino-p1", brand: "McLaren", name: "P1 Casino Edition", value: 5500000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-laferrari", brand: "Ferrari", name: "LaFerrari Casino", value: 5200000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-veyron", brand: "Bugatti", name: "Veyron Casino Edition", value: 4500000, rarity: "hyper" as const, chance: 0.01 },
  { id: "casino-918", brand: "Porsche", name: "918 Spyder Casino", value: 3200000, rarity: "exotic" as const, chance: 0.01 },
  { id: "casino-gt-black", brand: "Mercedes-AMG", name: "GT Black Series Casino", value: 2000000, rarity: "legendary" as const, chance: 0.02 },
  { id: "casino-huracan", brand: "Lamborghini", name: "Huracán Casino Edition", value: 1500000, rarity: "legendary" as const, chance: 0.02 },
  { id: "casino-911-gt3", brand: "Porsche", name: "911 GT3 RS Casino", value: 1200000, rarity: "legendary" as const, chance: 0.025 },
  { id: "casino-f458", brand: "Ferrari", name: "458 Italia Casino", value: 900000, rarity: "legendary" as const, chance: 0.03 },
  { id: "casino-r8", brand: "Audi", name: "R8 V10 Casino Edition", value: 750000, rarity: "legendary" as const, chance: 0.03 },
  { id: "casino-720s", brand: "McLaren", name: "720S Casino Edition", value: 650000, rarity: "exotic" as const, chance: 0.04 },
  { id: "casino-vantage", brand: "Aston Martin", name: "Vantage Casino Edition", value: 500000, rarity: "legendary" as const, chance: 0.04 },
  { id: "casino-amg-gt", brand: "Mercedes-AMG", name: "AMG GT Casino Edition", value: 400000, rarity: "legendary" as const, chance: 0.05 },
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
    <div className="space-y-3 w-full max-w-lg">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(1, Math.floor(value / 2)))}
          className="rounded-lg bg-white/5 px-5 py-3 text-sm font-bold text-white/50 hover:bg-white/10 transition-colors">½ ←</button>
        <input type="number" value={value} max={max}
          onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
          onBlur={() => onChange(Math.max(1, Math.min(max, value)))}
          className="flex-1 rounded-xl border-2 border-white/15 bg-[#0a0a0c] px-5 py-3.5 text-xl font-bold text-white text-center outline-none focus:border-apex-red transition-colors" />
        <button type="button" onClick={() => onChange(Math.min(max, value * 2))}
          className="rounded-lg bg-white/5 px-5 py-3 text-sm font-bold text-white/50 hover:bg-white/10 transition-colors">→ 2×</button>
      </div>
      <p className="text-right text-xs font-bold text-white/30">Max: ${max.toLocaleString()}</p>
      <div className="flex gap-2">
        {presets.filter((p) => p <= max).slice(0, 5).map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className={cn("rounded-lg px-4 py-2 text-sm font-bold transition-colors", value === p ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
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
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-8 lg:p-10">
      <div className="mb-8 flex items-center gap-4">
        <span className="text-5xl">{emoji}</span>
        <h3 className="font-display text-3xl font-black text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  COINFLIP                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
function CoinflipGame({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [mode, setMode] = useState<"cash" | "car">("cash");
  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [carPrize, setCarPrize] = useState<string | null>(null);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [wonCar, setWonCar] = useState<string | null>(null);
  const [lostCar, setLostCar] = useState<string | null>(null);

  const gambleCars = useMemo(() =>
    Object.keys(state.ownedCars).filter((id) => id !== state.activeCarId).map((id) => GAME_CAR_MAP[id]).filter(Boolean),
    [state.ownedCars, state.activeCarId]
  );

  const play = useCallback(() => {
    if (mode === "cash") {
      if (state.cash < bet) return toast.error("Not enough cash!");
      dispatch({ type: "ADD_CASH", amount: -bet }); // Deduct upfront
    } else {
      if (!selectedCar) return toast.error("Select a car to gamble!");
    }
    setSpinning(true); setResult(null); setWon(null); setCarPrize(null); setWonCar(null); setLostCar(null);
    setTimeout(() => {
      const r: "heads" | "tails" = Math.random() < 0.45 ? "heads" : "tails";
      setResult(r);
      const wonGame = r === pick;
      setWon(wonGame);
      if (mode === "cash") {
        if (wonGame) {
          dispatch({ type: "ADD_CASH", amount: bet * 2 }); // Win: get bet back + profit
        }
        // Lose: bet already deducted, nothing to do
      } else {
        // Car gambling: win = get similar-value car, lose = lose your car
        if (wonGame) {
          const betCar = GAME_CAR_MAP[selectedCar!];
          const betValue = betCar?.value ?? 0;
          // Find house cars within 50% of bet car value
          const houseCars = ["ferrari-f8-19", "huracan-15", "911-turbo-s-19", "mclaren-720s-17", "amg-gt-black-18", "ferrari-458-12", "911-gt3-18", "amg-c63-18", "m4-18", "corvette-c6-08"]
            .map((id) => GAME_CAR_MAP[id])
            .filter((c) => c && Math.abs(c.value - betValue) < betValue * 0.5);
          const prizeCar = houseCars.length > 0 ? houseCars[Math.floor(Math.random() * houseCars.length)] : GAME_CAR_MAP["ferrari-f8-19"]!;
          dispatch({ type: "ADD_CAR", carId: prizeCar.id });
          setWonCar(`${prizeCar.brand} ${prizeCar.name}`);
          toast.success(`WON a ${prizeCar.name}!`);
        } else {
          // Lose = always lose your car
          dispatch({ type: "REMOVE_CAR", carId: selectedCar! });
          const lost = GAME_CAR_MAP[selectedCar!];
          setLostCar(lost ? `${lost.brand} ${lost.name}` : selectedCar);
        }
      }
      setSpinning(false);
    }, 1500);
  }, [mode, bet, pick, selectedCar, state.cash, dispatch]);

  return (
    <GameLayout title="Coinflip" emoji="🪙">
      <div className="flex flex-col items-center gap-8">
        {/* Mode toggle */}
        <div className="flex gap-3">
          {(["cash", "car"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn("rounded-xl border-2 px-8 py-3 font-display text-base font-bold uppercase tracking-wider transition-all",
                mode === m ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/15 text-white/50 hover:border-white/30"
              )}>
              {m === "cash" ? "💵 Cash" : "🚗 Gamble Car"}
            </button>
          ))}
        </div>

        {/* HUGE Coin */}
        <motion.div
          animate={spinning ? { rotateY: [0, 1800] } : result === "heads" ? { rotateY: 0 } : result === "tails" ? { rotateY: 180 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="perspective-800"
        >
          <div className={cn(
            "size-48 lg:size-56 rounded-full border-6 flex items-center justify-center text-7xl font-black shadow-2xl transition-all duration-500",
            spinning ? "animate-pulse border-amber-400 bg-gradient-to-br from-amber-300 to-amber-500" :
            result === "heads" ? "border-amber-500 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-amber-500/40" :
            result === "tails" ? "border-gray-400 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 shadow-gray-400/40" :
            "border-amber-500 bg-gradient-to-br from-amber-400 to-amber-600"
          )}>
            {spinning ? (
              <span className="animate-spin text-8xl">🪙</span>
            ) : result === "heads" ? (
              <span className="text-amber-900 drop-shadow-lg">H</span>
            ) : result === "tails" ? (
              <span className="text-gray-800 drop-shadow-lg">T</span>
            ) : (
              <span className="text-amber-900">?</span>
            )}
          </div>
        </motion.div>

        {/* Heads/Tails buttons - BIG */}
        <div className="flex gap-6">
          {(["heads", "tails"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPick(s)} className={cn(
              "rounded-2xl border-3 px-12 py-5 font-display text-xl font-black uppercase tracking-wider transition-all transform hover:scale-105",
              pick === s ? "border-apex-red bg-apex-red/20 text-white shadow-lg shadow-apex-red/20" : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/70"
            )}>
              <span className="text-4xl block mb-1">{s === "heads" ? "👑" : "🔴"}</span>
              {s}
            </button>
          ))}
        </div>

        {/* Bet or car selector */}
        {mode === "cash" ? (
          <BetInput value={bet} onChange={setBet} max={state.cash} />
        ) : (
          <div className="w-full max-w-lg space-y-3">
            <p className="text-center text-sm font-bold text-white/50">Select a car to gamble:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
              {gambleCars.length === 0 ? (
                <p className="col-span-2 py-4 text-center text-sm text-white/30">No cars to gamble. Buy some first!</p>
              ) : gambleCars.map((car) => (
                <button key={car.id} type="button" onClick={() => setSelectedCar(car.id)}
                  className={cn("flex items-center gap-3 rounded-xl border-2 p-4 transition-all",
                    selectedCar === car.id ? "border-amber-500 bg-amber-500/15" : "border-white/10 bg-[#0a0a0c] hover:border-white/30"
                  )}>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-white">{car.brand} {car.name}</p>
                    <p className="text-xs text-white/30">${car.value.toLocaleString()}</p>
                  </div>
                  {selectedCar === car.id && <span className="text-amber-400 text-lg">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flip button - BIG */}
        <button type="button" onClick={play} disabled={spinning || (mode === "cash" ? state.cash < bet : !selectedCar)}
          className="rounded-2xl bg-apex-red px-16 py-5 font-display text-xl font-black uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-apex-red/30">
          {spinning ? "Flipping..." : mode === "cash" ? `Flip — $${bet.toLocaleString()}` : "Flip for a Car!"}
        </button>

        {/* Result */}
        {won !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-2xl px-10 py-5 font-display text-2xl font-black",
            won ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" : "bg-red-500/20 text-red-400 border-2 border-red-500/30"
          )}>
            {mode === "cash" ? (
              won ? `+$${bet.toLocaleString()} — ${result?.toUpperCase()}!` : `-$${bet.toLocaleString()} — ${result?.toUpperCase()}!`
            ) : (
              won ? `WON! You got a new car!` : `LOST! Your car is gone! ${lostCar}`
            )}
          </motion.div>
        )}
        {wonCar && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl border-2 border-green-500/50 bg-green-500/15 px-8 py-6 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-green-400">🏆 YOU WON A CAR!</p>
            <p className="mt-2 font-display text-2xl font-black text-white">{wonCar}</p>
          </motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-2 font-display text-2xl font-black text-white">{carPrize}</p>
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
        <div className="relative w-full overflow-hidden h-20 rounded-xl">
          <motion.div animate={spinning ? { x: [-wheelOffset, -wheelOffset - 2000] } : {}}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute top-0 left-0 flex gap-1.5">
            {[...ROULETTE_NUMS, ...ROULETTE_NUMS, ...ROULETTE_NUMS].map((n, i) => (
              <div key={i} className={cn("flex size-14 items-center justify-center rounded-full text-sm font-bold text-white", numColor(n))}>{n}</div>
            ))}
          </motion.div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-white z-10" />
        </div>

        {/* Result */}
        {landing !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={cn("flex size-20 items-center justify-center rounded-full text-2xl font-black text-white border-3", numColor(landing), "border-white shadow-xl")}>
            {landing}
          </motion.div>
        )}

        {/* Number grid */}
        <div className="overflow-x-auto w-full max-w-3xl">
          <div className="flex gap-1.5 mb-1.5">
            <button type="button" onClick={() => placeBet({ kind: "number", value: 0 })}
              className={cn("size-14 rounded-xl text-base font-bold text-white border-2 transition-all", numColor(0), currentBet?.kind === "number" && currentBet.value === 0 ? "ring-3 ring-amber-400" : "border-white/20")}>0</button>
          </div>
          {GRID_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1.5 mb-1.5">
              {row.map((n) => (
                <button key={n} type="button" onClick={() => placeBet({ kind: "number", value: n })}
                  className={cn("size-14 rounded-xl text-sm font-bold text-white border-2 transition-all",
                    numColor(n), currentBet?.kind === "number" && currentBet.value === n ? "ring-3 ring-amber-400" : "border-white/20 hover:ring-2 hover:ring-white/30"
                  )}>{n}</button>
              ))}
              <button type="button" onClick={() => placeBet({ kind: "range", value: ri === 0 ? "3rd" : ri === 1 ? "2nd" : "1st" })}
                className={cn("w-20 rounded-xl text-xs font-bold text-white bg-white/10 border-2 border-white/20 hover:bg-white/20")}>2 to 1</button>
            </div>
          ))}
          {/* Bottom row: dozens */}
          <div className="flex gap-1.5 mb-1.5">
            {[{ l: "1st 12", v: "1st" as const }, { l: "2nd 12", v: "2nd" as const }, { l: "3rd 12", v: "3rd" as const }].map((d) => (
              <button key={d.v} type="button" onClick={() => placeBet({ kind: "range", value: d.v })}
                className={cn("flex-1 h-12 rounded-xl text-sm font-bold text-white bg-white/10 border-2 border-white/20 hover:bg-white/20")}>{d.l}</button>
            ))}
          </div>
          {/* Bottom row: even/odd/color/etc */}
          <div className="flex gap-1.5">
            {[
              { l: "1-18", b: { kind: "range" as const, value: "1-18" as const } },
              { l: "EVEN", b: { kind: "parity" as const, value: "even" as const } },
              { l: "🔴 RED", b: { kind: "color" as const, value: "red" as const }, cls: "bg-red-600 hover:bg-red-700" },
              { l: "⚫ BLACK", b: { kind: "color" as const, value: "black" as const }, cls: "bg-gray-800 hover:bg-gray-700" },
              { l: "ODD", b: { kind: "parity" as const, value: "odd" as const } },
              { l: "19-36", b: { kind: "range" as const, value: "19-36" as const } },
            ].map((opt) => (
              <button key={opt.l} type="button" onClick={() => placeBet(opt.b)}
                className={cn("flex-1 h-12 rounded-xl text-sm font-bold text-white border-2 border-white/20 transition-all",
                  opt.cls ?? "bg-white/10 hover:bg-white/20",
                  JSON.stringify(currentBet) === JSON.stringify(opt.b) && "ring-3 ring-amber-400"
                )}>{opt.l}</button>
            ))}
          </div>
        </div>

        {/* Current bet display */}
        {currentBet && <p className="text-base text-white/50 font-bold">Bet: ${bet.toLocaleString()} on {JSON.stringify(currentBet.value)}</p>}

        {/* Spin button */}
        <button type="button" onClick={spin} disabled={spinning || !currentBet || state.cash < bet}
          className="w-full max-w-lg rounded-2xl bg-apex-red py-5 font-display text-xl font-black uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 hover:scale-105 disabled:opacity-40 shadow-lg shadow-apex-red/30">
          {spinning ? "Spinning..." : "Bet"}
        </button>

        {/* Result */}
        {won !== null && !spinning && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-2xl px-10 py-5 font-display text-2xl font-black",
            won ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" : "bg-red-500/20 text-red-400 border-2 border-red-500/30"
          )}>
            {won ? `+$${winAmount.toLocaleString()}!` : `-$${bet.toLocaleString()}!`}
          </motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6 text-center">
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
    crashPoint.current = Math.max(1.01, Math.pow(Math.random(), 0.3) * 3 + 1);
    let mult = 1.0;
    timerRef.current = setInterval(() => {
      mult += 0.02 + mult * 0.005;
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
    toast.success(`Cashed out at ${multiplier.toFixed(2)}× — +$${win.toLocaleString()}`);
  }, [playing, crashed, bet, multiplier, dispatch]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <GameLayout title="Crash" emoji="📈">
      <div className="flex flex-col items-center gap-6">
        <div className={cn("flex h-52 w-full max-w-lg items-center justify-center rounded-3xl border-3 text-8xl font-black font-mono transition-colors shadow-2xl",
          crashed ? "border-red-500 bg-red-500/10 text-red-400" : cashedOut ? "border-green-500 bg-green-500/10 text-green-400" : playing ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/20 bg-[#0a0a0c] text-white/30"
        )}>
          {crashed ? "CRASHED" : `${multiplier.toFixed(2)}×`}
        </div>
        <div className="w-full max-w-lg"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        {playing ? (
          <button type="button" onClick={cashOut}
            className="rounded-2xl bg-green-600 px-16 py-6 font-display text-2xl font-black uppercase tracking-wider text-white transition-all hover:bg-green-700 hover:scale-105 animate-pulse shadow-lg shadow-green-600/30">
            CASH OUT — ${(bet * multiplier).toFixed(0)}
          </button>
        ) : (
          <button type="button" onClick={start} disabled={state.cash < bet}
            className="rounded-2xl bg-apex-red px-16 py-5 font-display text-xl font-black uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 hover:scale-105 disabled:opacity-40 shadow-lg shadow-apex-red/30">
            {crashed ? "Play Again" : "Start"} — ${bet.toLocaleString()}
          </button>
        )}
        {cashedOut && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl px-10 py-5 font-display text-2xl font-black bg-green-500/20 text-green-400 border-2 border-green-500/30">Cashed out at {cashedAt.toFixed(2)}×!</motion.div>}
        {crashed && !cashedOut && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl px-10 py-5 font-display text-2xl font-black bg-red-500/20 text-red-400 border-2 border-red-500/30">Crashed at {multiplier.toFixed(2)}×!</motion.div>}
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
      const mult = 1 + (nr.size / safe) * (mineCount * 1.2);
      setCurrentMult(mult);
      if (nr.size === safe) {
        const win = Math.floor(bet * mult); dispatch({ type: "ADD_CASH", amount: win });
        setPlaying(false); setWon(win); toast.success(`All clear! +$${win.toLocaleString()}`);
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
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-lg"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white/50">Mines:</span>
          {[3, 5, 7, 10].map((n) => (
            <button key={n} type="button" onClick={() => !playing && setMineCount(n)} disabled={playing}
              className={cn("rounded-lg px-5 py-2 text-sm font-bold transition-colors", mineCount === n ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: ROWS * COLS }, (_, i) => (
            <button key={i} type="button" onClick={() => reveal(i)} disabled={!playing || revealed.has(i) || gameOver}
              className={cn("flex size-18 items-center justify-center rounded-2xl border-3 text-3xl font-bold transition-all hover:scale-105",
                revealed.has(i) ? mines.has(i) ? "border-red-500 bg-red-500/20 text-red-400" : "border-green-500 bg-green-500/20 text-green-400"
                : gameOver && mines.has(i) ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-white/15 bg-[#0a0a0c] hover:border-white/30"
              )}>
              {revealed.has(i) ? (mines.has(i) ? "💣" : "💎") : gameOver && mines.has(i) ? "💣" : ""}
            </button>
          ))}
        </div>
        {playing && revealed.size > 0 && (
          <button type="button" onClick={cashOut}
            className="rounded-2xl bg-green-600 px-12 py-5 font-display text-xl font-black uppercase tracking-wider text-white transition-all hover:bg-green-700 hover:scale-105 shadow-lg shadow-green-600/30">
            Cash Out — ${Math.floor(bet * currentMult).toLocaleString()} ({currentMult.toFixed(2)}×)
          </button>
        )}
        {!playing && !gameOver && (
          <button type="button" onClick={start} disabled={state.cash < bet}
            className="rounded-2xl bg-apex-red px-16 py-5 font-display text-xl font-black uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 hover:scale-105 disabled:opacity-40 shadow-lg shadow-apex-red/30">
            Start — ${bet.toLocaleString()}
          </button>
        )}
        {won !== null && gameOver && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-2xl px-10 py-5 font-display text-2xl font-black",
            won > 0 ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" : "bg-red-500/20 text-red-400 border-2 border-red-500/30"
          )}>{won > 0 ? `+$${won.toLocaleString()}!` : `-$${Math.abs(won).toLocaleString()}!`}</motion.div>
        )}
        {carPrize && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/15 px-8 py-6 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-400">🎰 CASINO PRIZE WON!</p>
            <p className="mt-2 font-display text-2xl font-black text-white">{carPrize}</p>
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
    const actual = Math.min(bet, state.cash);
    if (actual <= 0) return toast.error("Not enough cash!");
    dispatch({ type: "ADD_CASH", amount: -actual });
    setPool((p) => [...p, { type: "cash", value: actual, label: `$${actual.toLocaleString()}` }]);
    toast.success(`Added $${actual.toLocaleString()} to the pool`);
  }, [bet, state.cash, dispatch]);

  const [showCarPicker, setShowCarPicker] = useState(false);

  const addCar = useCallback((carId: string) => {
    const car = GAME_CAR_MAP[carId];
    if (!car) return;
    dispatch({ type: "REMOVE_CAR", carId: car.id });
    setPool((p) => [...p, { type: "car", value: car.value, label: `${car.brand} ${car.name}` }]);
    toast.success(`Added ${car.brand} ${car.name} ($${car.value.toLocaleString()}) to pool`);
    setShowCarPicker(false);
  }, [dispatch]);

  const gambleCars = useMemo(() =>
    Object.keys(state.ownedCars).filter((id) => id !== state.activeCarId).map((id) => GAME_CAR_MAP[id]).filter(Boolean),
    [state.ownedCars, state.activeCarId]
  );

  const draw = useCallback(() => {
    if (pool.length === 0) return toast.error("Pool is empty!");
    setSpinning(true); setWinner(null); setCarPrize(null);
    setTimeout(() => {
      // 55% player wins
      const playerWins = Math.random() < 0.4;
      if (playerWins) {
        dispatch({ type: "ADD_CASH", amount: totalPool });
        setWinner("YOU WON THE JACKPOT!");
        // Casino car prize on jackpot win
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
        <div className="w-full max-w-lg rounded-3xl border-3 border-amber-500/50 bg-amber-500/10 p-8 shadow-2xl shadow-amber-500/10">
          <div className="text-center mb-6">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-400/60">Prize Pool</p>
            <p className="font-mono text-6xl font-black text-amber-400 mt-2">${totalPool.toLocaleString()}</p>
          </div>
          {pool.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pool.map((p, i) => (
                <div key={i} className={cn("flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold",
                  p.type === "car" ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-white/60"
                )}>
                  <span>{p.type === "car" ? "🚗" : "💵"} {p.label}</span>
                  <span>${p.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {spinning && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-7xl">🎲</motion.div>}

        {/* Bet controls */}
        <div className="w-full max-w-lg"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>

        <div className="flex gap-4">
          <button type="button" onClick={addCash} disabled={spinning || state.cash < bet}
            className="rounded-2xl border-2 border-white/20 bg-white/5 px-8 py-4 font-display text-base font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 hover:scale-105 disabled:opacity-40">
            💵 Add Cash
          </button>
          <button type="button" onClick={() => setShowCarPicker(!showCarPicker)} disabled={spinning || gambleCars.length === 0}
            className={cn("rounded-2xl border-2 px-8 py-4 font-display text-base font-bold uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-40",
              showCarPicker ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
            )}>
            🚗 Gamble Car {gambleCars.length > 0 && <span className="ml-1 text-xs opacity-60">({gambleCars.length})</span>}
          </button>
          <button type="button" onClick={draw} disabled={spinning || pool.length === 0}
            className="rounded-2xl bg-apex-red px-10 py-4 font-display text-base font-bold uppercase tracking-wider text-white transition-all hover:bg-apex-red/80 hover:scale-105 disabled:opacity-40 shadow-lg shadow-apex-red/30">
            Draw Winner
          </button>
        </div>

        {/* Car picker */}
        {showCarPicker && (
          <div className="w-full max-w-lg rounded-2xl border-2 border-purple-500/30 bg-[#0a0a0c] p-4">
            <p className="mb-3 text-sm font-bold text-purple-400">Select a car to add to the pool:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
              {gambleCars.map((car) => (
                <button key={car.id} type="button" onClick={() => addCar(car.id)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111114] p-3 text-left transition-all hover:border-purple-500/50 hover:bg-purple-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-white">{car.brand} {car.name}</p>
                    <p className="text-xs text-white/30">${car.value.toLocaleString()}</p>
                  </div>
                  <span className="text-purple-400 text-lg">+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {winner && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-2xl px-10 py-6 font-display text-2xl font-black",
            winner.includes("YOU") ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" : "bg-red-500/20 text-red-400 border-2 border-red-500/30"
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
      const won = Math.random() < 0.45;
      if (won) { dispatch({ type: "ADD_CASH", amount: bet * 2 });
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
