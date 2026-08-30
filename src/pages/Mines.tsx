import { useCallback, useMemo, useState } from "react";
import { useGems, formatGems } from "@/context/gem-context";
import { GemDiamond } from "@/components/GemDiamond";
import { cn } from "@/lib/utils";

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

export default function Mines() {
  const { gems, addGems, spendGems } = useGems();
  const [betAmount, setBetAmount] = useState(20_000_000);
  const [mineCount, setMineCount] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [cashedOut, setCashedOut] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);

  const safeTiles = TOTAL_TILES - mineCount;

  // Calculate multiplier based on revealed safe tiles
  const currentMultiplier = useMemo(() => {
    if (revealed.size === 0) return 1;
    let mult = 1;
    for (let i = 0; i < revealed.size; i++) {
      mult *= (TOTAL_TILES - i) / (TOTAL_TILES - i - mineCount);
    }
    return mult;
  }, [revealed.size, mineCount]);

  const nextMultiplier = useMemo(() => {
    const n = revealed.size;
    return (TOTAL_TILES - n) / (TOTAL_TILES - n - mineCount);
  }, [revealed.size, mineCount]);

  const currentPayout = Math.floor(betAmount * currentMultiplier);
  const nextPayout = Math.floor(betAmount * currentMultiplier * nextMultiplier);

  const startGame = useCallback(() => {
    if (!spendGems(betAmount)) return;

    const positions = new Set<number>();
    while (positions.size < mineCount) {
      positions.add(Math.floor(Math.random() * TOTAL_TILES));
    }
    setMinePositions(positions);
    setRevealed(new Set());
    setPlaying(true);
    setCashedOut(false);
    setLastWin(null);
  }, [spendGems, betAmount, mineCount]);

  const selectTile = useCallback(
    (index: number) => {
      if (!playing || revealed.has(index)) return;

      if (minePositions.has(index)) {
        // Hit a mine — reveal all
        setRevealed(new Set(Array.from({ length: TOTAL_TILES }, (_, i) => i)));
        setPlaying(false);
        setLastWin(-betAmount);
        return;
      }

      const newRevealed = new Set(revealed);
      newRevealed.add(index);
      setRevealed(newRevealed);

      // Check if all safe tiles are revealed
      if (newRevealed.size >= safeTiles) {
        const winAmount = Math.floor(betAmount * currentMultiplier * nextMultiplier);
        addGems(winAmount);
        setCashedOut(true);
        setPlaying(false);
        setLastWin(winAmount);
      }
    },
    [playing, revealed, minePositions, betAmount, currentMultiplier, nextMultiplier, safeTiles, addGems],
  );

  const cashOut = useCallback(() => {
    if (!playing || revealed.size === 0) return;
    const winAmount = Math.floor(betAmount * currentMultiplier);
    addGems(winAmount);
    setCashedOut(true);
    setPlaying(false);
    setLastWin(winAmount);
  }, [playing, revealed.size, betAmount, currentMultiplier, addGems]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-2 font-display text-3xl font-black uppercase tracking-tight">
        Mines
      </h1>

      {/* Current payout */}
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-muted">
          Current Payout
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <GemDiamond className="size-6" />
          <span className="font-display text-3xl font-black text-white">
            {playing ? formatGems(currentPayout) : "0"}
          </span>
        </div>
        {playing && (
          <p className="mt-1 text-sm text-petbet-muted">
            Next: + {formatGems(nextPayout)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel — controls */}
        <div className="w-full max-w-xs shrink-0 rounded-xl bg-petbet-panel p-5">
          <h2 className="mb-4 font-display text-lg font-black uppercase">Mines</h2>

          {/* Bet amount */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
              Bet Amount
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-petbet-panel-2 px-3 py-2">
              <GemDiamond className="size-3.5" />
              <input
                type="text"
                value={formatGems(betAmount)}
                readOnly
                className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setBetAmount((v) => Math.max(100, Math.floor(v / 2)))}
                className="rounded bg-petbet-panel-3 px-2 py-1 text-[10px] font-bold text-white/60"
              >
                ½
              </button>
              <button
                type="button"
                onClick={() => setBetAmount((v) => v * 2)}
                className="rounded bg-petbet-panel-3 px-2 py-1 text-[10px] font-bold text-white/60"
              >
                2×
              </button>
            </div>
          </div>

          {/* Mines slider */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
              Mines
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm">💣</span>
              <span className="text-sm font-bold text-white">{mineCount}</span>
              <input
                type="range"
                min={1}
                max={22}
                value={mineCount}
                onChange={(e) => {
                  if (!playing) setMineCount(Number(e.target.value));
                }}
                className="flex-1 accent-petbet-blue"
              />
              <GemDiamond className="size-3.5" />
              <span className="text-sm font-bold text-white">{safeTiles}</span>
            </div>
          </div>

          {/* Info */}
          <div className="mb-4 space-y-2 rounded-lg bg-petbet-panel-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-petbet-muted">Mines</span>
              <span className="font-bold text-white">{mineCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-petbet-muted">Safe tiles</span>
              <span className="font-bold text-white">{safeTiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-petbet-muted">Multiplier</span>
              <span className="font-bold text-white">{currentMultiplier.toFixed(2)}×</span>
            </div>
          </div>

          {!playing ? (
            <button
              type="button"
              onClick={startGame}
              className="w-full rounded-xl bg-petbet-green py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-petbet-green-dark"
            >
              Play Now
            </button>
          ) : (
            <button
              type="button"
              onClick={cashOut}
              disabled={revealed.size === 0}
              className={cn(
                "w-full rounded-xl py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors",
                revealed.size > 0
                  ? "bg-petbet-green hover:bg-petbet-green-dark"
                  : "bg-petbet-panel-2 text-petbet-muted cursor-not-allowed",
              )}
            >
              Cash Out {revealed.size > 0 ? formatGems(currentPayout) : ""}
            </button>
          )}
        </div>

        {/* Mines grid */}
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: TOTAL_TILES }).map((_, i) => {
              const isRevealed = revealed.has(i);
              const isMine = isRevealed && minePositions.has(i);
              const isSafe = isRevealed && !minePositions.has(i);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectTile(i)}
                  disabled={!playing || isRevealed}
                  className={cn(
                    "aspect-square rounded-lg transition-all",
                    isMine
                      ? "bg-red-500/30 border-2 border-red-500"
                      : isSafe
                        ? "bg-petbet-green/20 border-2 border-petbet-green"
                        : playing
                          ? "bg-petbet-panel-3 border-2 border-transparent hover:border-petbet-blue/50 cursor-pointer"
                          : "bg-petbet-panel-3 border-2 border-transparent",
                  )}
                >
                  {isMine && <span className="text-2xl">💣</span>}
                  {isSafe && <span className="text-2xl">💎</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Win/Loss notification */}
      {lastWin !== null && (
        <div
          className={cn(
            "mt-4 rounded-xl p-4 text-center font-display text-lg font-bold",
            lastWin > 0
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20",
          )}
        >
          {lastWin > 0 ? `Won ${formatGems(lastWin)} gems!` : `Lost ${formatGems(Math.abs(lastWin))} gems`}
        </div>
      )}
    </div>
  );
}
