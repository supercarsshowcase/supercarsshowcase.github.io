import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Gauge, Lock, Shield, Trophy, Zap } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { GAME_CAR_MAP, RARITY_META, fmtMoney, gameCarImage, levelFrom } from "@/game/data";
import { carPower, carValue, type Action } from "@/game/engine";
import type { GameState, GameCarDef } from "@/game/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Race tiers ──────────────────────────────────────────────────────────────

interface RaceTier {
  id: string;
  name: string;
  icon: string;
  entryFee: number;
  prizeMultiplier: number;
  difficulty: number; // 1.0 = even, higher = harder opponents
  unlockLevel: number;
  color: string;
  desc: string;
}

const RACE_TIERS: RaceTier[] = [
  {
    id: "street",
    name: "Street Race",
    icon: "🚗",
    entryFee: 200,
    prizeMultiplier: 2.5,
    difficulty: 0.85,
    unlockLevel: 1,
    color: "#9ca3af",
    desc: "Back-alley showdown. Low stakes, big attitude.",
  },
  {
    id: "sprint",
    name: "Sprint",
    icon: "🏁",
    entryFee: 2000,
    prizeMultiplier: 3,
    difficulty: 1.0,
    unlockLevel: 5,
    color: "#4ade80",
    desc: "Quarter-mile drag. Let your power do the talking.",
  },
  {
    id: "grandprix",
    name: "Grand Prix",
    icon: "🏆",
    entryFee: 25000,
    prizeMultiplier: 3.5,
    difficulty: 1.15,
    unlockLevel: 15,
    color: "#38bdf8",
    desc: "Full circuit. Precision, speed and nerve.",
  },
  {
    id: "elite",
    name: "Elite Cup",
    icon: "⚡",
    entryFee: 250000,
    prizeMultiplier: 4,
    difficulty: 1.3,
    unlockLevel: 35,
    color: "#a78bfa",
    desc: "Invitation-only. Only the fastest survive.",
  },
  {
    id: "hyper",
    name: "Hyper League",
    icon: "🔥",
    entryFee: 5000000,
    prizeMultiplier: 5,
    difficulty: 1.5,
    unlockLevel: 70,
    color: "#fb7185",
    desc: "Where legends are made. Bring everything.",
  },
];

const TIER_MAP: Record<string, RaceTier> = Object.fromEntries(
  RACE_TIERS.map((t) => [t.id, t]),
);

// ── Race cooldown ───────────────────────────────────────────────────────────

const RACE_COOLDOWN_MS = 60_000; // 60 seconds between races

// ── AI opponent names ───────────────────────────────────────────────────────

const OPPONENT_NAMES = [
  "PhantomRacer",
  "ShadowDrift",
  "NightHawk",
  "IronViper",
  "BlazeRunner",
  "StormChaser",
  "GhostLap",
  "SteelFury",
  "RedLine_Rick",
  "TurboKing",
  "ApexPredator",
  "DriftMaster",
  "ZeroG_Racer",
  "TurboNova",
  "BlitzDrive",
  "NeonPulse",
  "QuantumSpeed",
  "VortexRider",
  "ThunderBolt",
  "FlashPoint",
  "CrimsonAce",
  "NitroGhost",
  "CarbonBeast",
  "TurboZen",
  "RocketMile",
  "PistonHero",
  "BurnoutKing",
  "VelocityX",
  "OverDrive",
  "GridHunter",
];

// ── Race result types ───────────────────────────────────────────────────────

type RacePhase = "select" | "racing" | "result";

interface RaceOpponent {
  name: string;
  car: GameCarDef;
  power: number;
  finishTime: number;
}

interface RaceState {
  phase: RacePhase;
  tier: RaceTier | null;
  opponent: RaceOpponent | null;
  playerProgress: number;
  opponentProgress: number;
  won: boolean;
  prize: number;
  raceTime: number;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function generateOpponent(playerPower: number, difficulty: number): RaceOpponent {
  // Pick a random car from the game that's within the player's power range ± 40%
  const allCars = Object.values(GAME_CAR_MAP).filter((c) => !c.secret);
  const minPower = playerPower * 0.3;
  const maxPower = playerPower * difficulty * 1.4;
  const candidates = allCars.filter(
    (c) => c.hp >= minPower * 0.001 && c.hp <= maxPower * 0.002,
  );
  // fallback: just pick any car
  const pool = candidates.length > 0 ? candidates : allCars;
  const car = pool[Math.floor(Math.random() * pool.length)];

  // Opponent power is scaled by difficulty around the player's power
  const base = playerPower * difficulty;
  const variance = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x
  const power = Math.round(base * variance);

  // Simulated finish time (lower is faster). ~8-12 seconds typical.
  const baseTime = 8 + Math.random() * 4;
  const powerFactor = Math.max(0.7, 1 - (power - playerPower) / (playerPower * 2));
  const finishTime = baseTime * powerFactor;

  const name = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];

  return { name, car, power, finishTime };
}

function racePrize(tier: RaceTier, playerPower: number, prestigeLevel: number): number {
  const base = tier.entryFee * tier.prizeMultiplier;
  const prestigeBonus = 1 + prestigeLevel * 0.25;
  const powerBonus = Math.max(1, playerPower / 500);
  return Math.round(base * prestigeBonus * Math.min(powerBonus, 3));
}

function raceWinChance(playerPower: number, opponentPower: number): number {
  // Simple power-based win chance with some randomness
  const ratio = playerPower / Math.max(1, opponentPower);
  // 0.5 ratio → ~25% win chance, 1.0 → ~50%, 2.0 → ~70%
  return Math.min(0.85, Math.max(0.1, 0.15 + ratio * 0.35));
}

// ── Component ───────────────────────────────────────────────────────────────

export function RacePanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const level = levelFrom(state);
  const ownedCars = useMemo(
    () =>
      Object.keys(state.ownedCars)
        .map((id) => GAME_CAR_MAP[id])
        .filter(Boolean) as GameCarDef[],
    [state.ownedCars],
  );

  const [selectedCarId, setSelectedCarId] = useState(state.activeCarId);
  const [selectedTierId, setSelectedTierId] = useState("street");
  const [race, setRace] = useState<RaceState>({
    phase: "select",
    tier: null,
    opponent: null,
    playerProgress: 0,
    opponentProgress: 0,
    won: false,
    prize: 0,
    raceTime: 0,
  });
  const [raceHistory, setRaceHistory] = useState<
    { tier: string; won: boolean; prize: number; time: number }[]
  >([]);
  const animFrameRef = useRef<number>(0);

  const selectedCar = GAME_CAR_MAP[selectedCarId];
  const selectedTier = TIER_MAP[selectedTierId];
  const playerPower = selectedCar ? carPower(state, selectedCarId) : 0;
  const now = Date.now();
  const cooldownLeft = Math.max(0, (state.lastRaceAt + RACE_COOLDOWN_MS - now) / 1000);
  const canRace = cooldownLeft <= 0 && selectedCar && selectedTier;

  const startRace = useCallback(() => {
    if (!selectedCar || !selectedTier || !canRace) return;

    const opponent = generateOpponent(playerPower, selectedTier.difficulty);
    const prize = racePrize(selectedTier, playerPower, state.prestigeLevel);
    const win = Math.random() < raceWinChance(playerPower, opponent.power);

    // Player finish time is based on their car power
    const baseTime = 8 + Math.random() * 4;
    const playerFactor = Math.max(0.7, 1 - (playerPower - opponent.power) / (opponent.power * 2));
    const playerFinishTime = win
      ? opponent.finishTime * (0.9 + Math.random() * 0.05)
      : opponent.finishTime * (1.05 + Math.random() * 0.15);

    setRace({
      phase: "racing",
      tier: selectedTier,
      opponent,
      playerProgress: 0,
      opponentProgress: 0,
      won: win,
      prize,
      raceTime: playerFinishTime,
    });

    // Animate the race
    const startTime = performance.now();
    const totalTime = Math.max(opponent.finishTime, playerFinishTime) * 1000 + 1500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / totalTime);

      // Player and opponent progress with slight easing
      const pProg = Math.min(1, (elapsed / (playerFinishTime * 1000)) * 1.02);
      const oProg = Math.min(1, (elapsed / (opponent.finishTime * 1000)) * 1.02);

      setRace((prev) => ({
        ...prev,
        playerProgress: pProg,
        opponentProgress: oProg,
      }));

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Race finished
        setTimeout(() => {
          dispatch({
            type: "START_RACE",
            cost: selectedTier.entryFee,
            prize: win ? prize : 0,
            won: win,
            now: Date.now(),
          });
          setRaceHistory((prev) => [
            {
              tier: selectedTier.name,
              won: win,
              prize: win ? prize : 0,
              time: playerFinishTime,
            },
            ...prev.slice(0, 9),
          ]);
          setRace((prev) => ({ ...prev, phase: "result" }));
          if (win) {
            toast.success(`🏆 Won ${fmtMoney(prize)}!`, {
              style: {
                background: "#0a1a0a",
                border: "1px solid rgba(74,222,128,0.5)",
                color: "#fff",
              },
            });
          } else {
            toast("Lost! Better luck next time.", {
              style: {
                background: "#1a0a0a",
                border: "1px solid rgba(255,100,100,0.3)",
                color: "#fff",
              },
            });
          }
        }, 800);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [selectedCar, selectedTier, canRace, playerPower, state.prestigeLevel, dispatch]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const resetToSelect = () => {
    setRace({
      phase: "select",
      tier: null,
      opponent: null,
      playerProgress: 0,
      opponentProgress: 0,
      won: false,
      prize: 0,
      raceTime: 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Race
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-white">
            RACE
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <Trophy className="size-4 text-apex-red" />
          <span>
            {raceHistory.filter((r) => r.won).length}W /{" "}
            {raceHistory.filter((r) => !r.won).length}L
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── SELECT PHASE ── */}
        {race.phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Car Selection */}
            <div>
              <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Choose Your Car
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ownedCars.map((car) => {
                  const power = carPower(state, car.id);
                  const meta = RARITY_META[car.rarity];
                  const isSelected = selectedCarId === car.id;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setSelectedCarId(car.id)}
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-apex-red bg-apex-red/10"
                          : "border-apex-line bg-apex-panel hover:border-white/20",
                      )}
                    >
                      <div className="flex h-16 items-center justify-center">
                        <SmartImage
                          src={gameCarImage(car)}
                          alt={car.name}
                          className="max-h-14 object-contain"
                        />
                      </div>
                      <p className="mt-2 truncate font-display text-[11px] font-bold text-white">
                        {car.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span
                          className="text-[9px] font-bold uppercase"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {power.toLocaleString()} HP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier Selection */}
            <div>
              <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Choose Race Tier
              </p>
              <div className="space-y-2">
                {RACE_TIERS.map((tier) => {
                  const locked = level < tier.unlockLevel;
                  const isSelected = selectedTierId === tier.id;
                  const prize = racePrize(tier, playerPower, state.prestigeLevel);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedTierId(tier.id)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        locked
                          ? "cursor-not-allowed border-white/5 bg-apex-panel/30 opacity-40"
                          : isSelected
                            ? "border-apex-red bg-apex-red/10"
                            : "border-apex-line bg-apex-panel hover:border-white/20",
                      )}
                    >
                      <span className="text-2xl">{tier.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="font-display text-sm font-black"
                            style={{ color: locked ? "#666" : tier.color }}
                          >
                            {tier.name}
                          </p>
                          {locked && (
                            <Lock className="size-3 text-white/30" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/35">{tier.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xs font-bold text-white/60">
                          {fmtMoney(tier.entryFee)}
                        </p>
                        <p className="text-[9px] text-apex-red">
                          Win {fmtMoney(prize)}
                        </p>
                        {locked && (
                          <p className="text-[9px] text-white/30">
                            Lv.{tier.unlockLevel}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Race Button */}
            <div className="flex flex-col items-center gap-3">
              {cooldownLeft > 0 && (
                <p className="text-[11px] text-white/40">
                  Cooldown: {Math.ceil(cooldownLeft)}s remaining
                </p>
              )}
              <button
                type="button"
                disabled={!canRace || cooldownLeft > 0}
                onClick={startRace}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-8 py-4 font-display text-sm font-black uppercase tracking-[0.15em] transition-all",
                  canRace && cooldownLeft <= 0
                    ? "bg-apex-red text-white hover:bg-apex-red/80 hover:shadow-[0_0_30px_-5px_rgba(255,46,0,0.5)]"
                    : "cursor-not-allowed bg-white/5 text-white/30",
                )}
              >
                <Flag className="size-5" />
                Start Race
                <span className="text-[10px] text-white/50">
                  Entry: {selectedTier ? fmtMoney(selectedTier.entryFee) : "$0"}
                </span>
              </button>
            </div>

            {/* Race History */}
            {raceHistory.length > 0 && (
              <div>
                <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  Recent Races
                </p>
                <div className="space-y-1.5">
                  {raceHistory.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-2.5",
                        r.won
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-red-500/20 bg-red-500/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            r.won ? "text-green-400" : "text-red-400",
                          )}
                        >
                          {r.won ? "WIN" : "LOSS"}
                        </span>
                        <span className="text-[11px] text-white/50">{r.tier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/30">
                          {r.time.toFixed(1)}s
                        </span>
                        {r.won && (
                          <span className="font-display text-xs font-bold text-green-400">
                            +{fmtMoney(r.prize)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RACING PHASE ── */}
        {race.phase === "racing" && race.tier && race.opponent && (
          <motion.div
            key="racing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Race Info */}
            <div className="flex items-center justify-between rounded-xl border border-apex-line bg-apex-panel p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{race.tier.icon}</span>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: race.tier.color }}
                >
                  {race.tier.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Gauge className="size-3.5" />
                <span>Entry: {fmtMoney(race.tier.entryFee)}</span>
              </div>
            </div>

            {/* Track */}
            <div className="relative space-y-6 rounded-2xl border border-apex-line bg-[#08080a] p-6">
              {/* Player car */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-apex-red" />
                  <span className="font-display text-[11px] font-bold text-white">
                    YOU
                  </span>
                  <span className="text-[10px] text-white/30">
                    {selectedCar?.name}
                  </span>
                </div>
                <div className="relative h-10 overflow-hidden rounded-lg bg-white/5">
                  {/* Track lines */}
                  <div className="absolute inset-0 flex items-center">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-px flex-1 bg-white/5"
                      />
                    ))}
                  </div>
                  {/* Finish line */}
                  <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-green-500 via-white to-green-500" />
                  {/* Car */}
                  <motion.div
                    className="absolute top-1/2 flex -translate-y-1/2 items-center"
                    style={{ left: `${Math.min(95, race.playerProgress * 100)}%` }}
                    transition={{ ease: "linear" }}
                  >
                    <div className="flex h-8 w-12 items-center justify-center rounded-md bg-apex-red text-[8px] font-bold text-white shadow-[0_0_15px_rgba(255,46,0,0.5)]">
                      YOU
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Opponent car */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="font-display text-[11px] font-bold text-white/70">
                    {race.opponent.name}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {race.opponent.car.name}
                  </span>
                </div>
                <div className="relative h-10 overflow-hidden rounded-lg bg-white/5">
                  <div className="absolute inset-0 flex items-center">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-px flex-1 bg-white/5"
                      />
                    ))}
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-green-500 via-white to-green-500" />
                  <motion.div
                    className="absolute top-1/2 flex -translate-y-1/2 items-center"
                    style={{ left: `${Math.min(95, race.opponentProgress * 100)}%` }}
                    transition={{ ease: "linear" }}
                  >
                    <div className="flex h-8 w-12 items-center justify-center rounded-md bg-blue-600 text-[8px] font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                      CPU
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Power comparison */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="font-display text-lg font-black text-apex-red">
                  {playerPower.toLocaleString()}
                </p>
                <p className="text-[9px] uppercase text-white/30">Your Power</p>
              </div>
              <Shield className="size-5 text-white/20" />
              <div className="text-center">
                <p className="font-display text-lg font-black text-blue-400">
                  {race.opponent.power.toLocaleString()}
                </p>
                <p className="text-[9px] uppercase text-white/30">Opponent</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RESULT PHASE ── */}
        {race.phase === "result" && race.tier && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.1 }}
              className={cn(
                "flex size-24 items-center justify-center rounded-full border-2",
                race.won
                  ? "border-green-500 bg-green-500/10"
                  : "border-red-500 bg-red-500/10",
              )}
            >
              {race.won ? (
                <Trophy className="size-12 text-green-400" />
              ) : (
                <Zap className="size-12 text-red-400" />
              )}
            </motion.div>

            <div className="text-center">
              <h3
                className={cn(
                  "font-display text-4xl font-black",
                  race.won ? "text-green-400" : "text-red-400",
                )}
              >
                {race.won ? "VICTORY" : "DEFEATED"}
              </h3>
              {race.won && (
                <p className="mt-2 font-display text-2xl font-black text-green-400">
                  +{fmtMoney(race.prize)}
                </p>
              )}
              <p className="mt-1 text-sm text-white/40">
                {race.tier.name} • {race.raceTime.toFixed(1)}s
              </p>
            </div>

            <button
              type="button"
              onClick={resetToSelect}
              className="rounded-xl border border-apex-red/40 bg-apex-red/10 px-8 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-apex-red"
            >
              Race Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
