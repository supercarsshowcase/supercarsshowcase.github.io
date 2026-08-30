import { Trophy } from "lucide-react";
import { GemDiamond } from "@/components/GemDiamond";
import { formatGems } from "@/context/gem-context";
import { cn } from "@/lib/utils";

const MOCK_LEADERBOARD = [
  { rank: 1, name: "PR3PPY_AZUKI10", gems: 5_200_000_000, level: 87 },
  { rank: 2, name: "GEM_KING99", gems: 3_800_000_000, level: 72 },
  { rank: 3, name: "TITAN_PET", gems: 2_100_000_000, level: 65 },
  { rank: 4, name: "LUCKY_SPINNER", gems: 1_500_000_000, level: 58 },
  { rank: 5, name: "DIAMOND_HUNTER", gems: 980_000_000, level: 51 },
  { rank: 6, name: "BIG_WINNER", gems: 750_000_000, level: 44 },
  { rank: 7, name: "GAMBLE_LORD", gems: 520_000_000, level: 39 },
  { rank: 8, name: "PS99_PRO", gems: 310_000_000, level: 33 },
  { rank: 9, name: "RISK_TAKER", gems: 180_000_000, level: 28 },
  { rank: 10, name: "NEW_PLAYER", gems: 50_000_000, level: 12 },
];

const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export default function Leaderboard() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="size-6 text-petbet-gold" />
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">
          Leaderboard
        </h1>
      </div>

      <div className="rounded-xl bg-petbet-panel overflow-hidden">
        {MOCK_LEADERBOARD.map((entry) => (
          <div
            key={entry.rank}
            className={cn(
              "flex items-center gap-4 border-b border-petbet-line px-4 py-3 last:border-0",
              entry.rank <= 3 && "bg-petbet-panel-2/50",
            )}
          >
            <span
              className={cn(
                "w-8 text-center font-display text-lg font-black",
                entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : "text-petbet-muted",
              )}
            >
              {entry.rank}
            </span>
            <div className="flex size-8 items-center justify-center rounded-full bg-petbet-panel-3 text-xs font-bold">
              {entry.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{entry.name}</p>
              <p className="text-[10px] text-petbet-muted">Level {entry.level}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <GemDiamond className="size-3.5" />
              <span className="text-sm font-bold text-petbet-gem">{formatGems(entry.gems)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
