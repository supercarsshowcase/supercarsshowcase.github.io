import { useCallback, useState } from "react";
import { useGems, formatGems } from "@/context/gem-context";
import { GemDiamond } from "@/components/GemDiamond";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "med" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { bombs: number; safe: number; mult: number; rows: number }> = {
  easy: { bombs: 1, safe: 3, mult: 1.33, rows: 6 },
  med: { bombs: 2, safe: 2, mult: 1.72, rows: 6 },
  hard: { bombs: 3, safe: 1, mult: 2.58, rows: 6 },
};

const COLS = 4;

export default function Tower() {
  const { gems, addGems, spendGems } = useGems();
  const [betAmount, setBetAmount] = useState(20_000_000);
  const [difficulty, setDifficulty] = useState<Difficulty>("med");
  const [playing, setPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(-1);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [bombs, setBombs] = useState<number[][]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [cashedOut, setCashedOut] = useState(false);

  const config = DIFFICULTY_CONFIG[difficulty];

  const nextPayout = betAmount * Math.pow(config.mult, currentRow + 2);
  const currentPayout = currentRow >= 0 ? betAmount * Math.pow(config.mult, currentRow + 1) : 0;

  const generateBombs = useCallback(() => {
    const allBombs: number[][] = [];
    for (let r = 0; r < config.rows; r++) {
      const rowBombs = new Set<number>();
      while (rowBombs.size < config.bombs) {
        rowBombs.add(Math.floor(Math.random() * COLS));
      }
      allBombs.push(Array.from(rowBombs));
    }
    return allBombs;
  }, [config]);

  const startGame = useCallback(() => {
    if (!spendGems(betAmount)) return;
    const newBombs = generateBombs();
    setBombs(newBombs);
    setRevealed(Array.from({ length: config.rows }, () => Array(COLS).fill(false)));
    setCurrentRow(-1);
    setMultiplier(1);
    setPlaying(true);
    setCashedOut(false);
  }, [spendGems, betAmount, generateBombs, config.rows]);

  const selectTile = useCallback(
    (row: number, col: number) => {
      if (!playing || row !== currentRow + 1) return;

      const newRevealed = revealed.map((r) => [...r]);
      const isBomb = bombs[row]?.includes(col) ?? false;

      // Reveal all tiles in this row
      for (let c = 0; c < COLS; c++) {
        newRevealed[row][c] = true;
      }
      setRevealed(newRevealed);

      if (isBomb) {
        // Game over
        setPlaying(false);
        return;
      }

      setCurrentRow(row);
      setMultiplier(Math.pow(config.mult, row + 1));

      // Check if reached the top
      if (row === config.rows - 1) {
        const winAmount = Math.floor(betAmount * Math.pow(config.mult, config.rows));
        addGems(winAmount);
        setCashedOut(true);
        setPlaying(false);
      }
    },
    [playing, currentRow, revealed, bombs, config, betAmount, addGems],
  );

  const cashOut = useCallback(() => {
    if (!playing || currentRow < 0) return;
    const winAmount = Math.floor(betAmount * Math.pow(config.mult, currentRow + 1));
    addGems(winAmount);
    setCashedOut(true);
    setPlaying(false);
  }, [playing, currentRow, betAmount, config.mult, addGems]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-2 font-display text-3xl font-black uppercase tracking-tight">
        Tower
      </h1>

      {/* Next payout display */}
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-muted">
          Next Payout
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <GemDiamond className="size-8" />
          <span className="font-display text-4xl font-black text-white">
            {playing ? formatGems(Math.floor(nextPayout)) : formatGems(betAmount * Math.pow(config.mult, 1))}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel — controls */}
        <div className="w-full max-w-xs shrink-0 rounded-xl bg-petbet-panel p-5">
          <h2 className="mb-4 font-display text-lg font-black uppercase">Tower</h2>

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

          {/* Difficulty */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
              Difficulty
            </p>
            <div className="flex gap-2">
              {(["easy", "med", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    if (!playing) setDifficulty(d);
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold uppercase transition-all",
                    difficulty === d
                      ? "bg-petbet-blue text-white"
                      : "bg-petbet-panel-2 text-petbet-muted hover:text-white",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Config info */}
          <div className="mb-4 space-y-2 rounded-lg bg-petbet-panel-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-petbet-muted">Bombs per row</span>
              <span className="font-bold text-white">{config.bombs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-petbet-muted">Safe tiles</span>
              <span className="font-bold text-white">{config.safe}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-petbet-muted">Mult per step</span>
              <span className="font-bold text-white">×{config.mult}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-petbet-muted">Rows</span>
              <span className="font-bold text-white">{config.rows}</span>
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
              disabled={currentRow < 0}
              className={cn(
                "w-full rounded-xl py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors",
                currentRow >= 0
                  ? "bg-petbet-green hover:bg-petbet-green-dark"
                  : "bg-petbet-panel-2 text-petbet-muted cursor-not-allowed",
              )}
            >
              Cash Out {currentRow >= 0 ? formatGems(Math.floor(currentPayout)) : ""}
            </button>
          )}

          {cashedOut && (
            <p className="mt-3 text-center text-sm font-bold text-petbet-green">
              Won {formatGems(Math.floor(currentPayout))} gems!
            </p>
          )}
        </div>

        {/* Tower grid */}
        <div className="flex-1">
          <div className="flex flex-col-reverse gap-2">
            {Array.from({ length: config.rows }).map((_, row) => (
              <div key={row} className="flex items-center gap-2">
                <div className="flex flex-1 gap-2">
                  {Array.from({ length: COLS }).map((_, col) => {
                    const isRevealed = revealed[row]?.[col] ?? false;
                    const isBomb = isRevealed && (bombs[row]?.includes(col) ?? false);
                    const isSafe = isRevealed && !isBomb;
                    const isClickable = playing && row === currentRow + 1;

                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => isClickable && selectTile(row, col)}
                        disabled={!isClickable}
                        className={cn(
                          "aspect-square flex-1 rounded-lg transition-all",
                          isBomb
                            ? "bg-red-500/30 border-2 border-red-500"
                            : isSafe
                              ? "bg-petbet-green/20 border-2 border-petbet-green"
                              : isClickable
                                ? "bg-petbet-panel-3 border-2 border-transparent hover:border-petbet-blue/50 cursor-pointer"
                                : "bg-petbet-panel-3 border-2 border-transparent",
                        )}
                      >
                        {isBomb && <span className="text-2xl">💣</span>}
                        {isSafe && <span className="text-2xl">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {/* Multiplier label */}
                <div className="w-16 text-right">
                  <span className="text-xs font-bold text-petbet-muted">
                    {Math.pow(config.mult, row + 1).toFixed(2)}×
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
