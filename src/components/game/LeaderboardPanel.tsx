import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

const RANK_COLORS = [
  "text-amber-400",   // 1st
  "text-gray-300",    // 2nd
  "text-amber-600",   // 3rd
];

const RANK_ICONS = [Crown, Medal, Star];

export function LeaderboardPanel() {
  const players = useQuery(api.leaderboard.getTopPlayers);
  const myRank = useQuery(api.leaderboard.getMyRank);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Rankings
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-white">
            LEADERBOARD
          </h2>
        </div>
        {myRank && (
          <div className="rounded-xl border border-apex-line bg-apex-panel px-4 py-3 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Your Rank
            </p>
            <p className="font-display text-xl font-black text-apex-red">
              #{myRank.rank}
            </p>
            <p className="text-[10px] text-white/50">{fmtMoney(myRank.cash)}</p>
          </div>
        )}
      </div>

      {players === undefined ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 animate-spin rounded-full border-2 border-apex-red border-t-transparent" />
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-apex-line bg-apex-panel py-16 text-center">
          <Trophy className="mx-auto size-10 text-white/20" />
          <p className="mt-3 font-display text-sm text-white/40">
            No players on the leaderboard yet.
          </p>
          <p className="mt-1 text-[10px] text-white/25">
            Your score updates automatically when you play.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {players.map((p, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const RankIcon = RANK_ICONS[i] ?? null;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors",
                  isTop3
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-apex-line bg-apex-panel hover:bg-white/5"
                )}
              >
                {/* Rank */}
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-black",
                    isTop3 ? "bg-amber-500/15" : "bg-white/5"
                  )}
                >
                  {RankIcon ? (
                    <RankIcon className={cn("size-4", RANK_COLORS[i])} />
                  ) : (
                    <span className={cn("text-white/50", rank > 50 && "text-white/30")}>
                      {rank}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-display text-sm font-bold",
                      isTop3 ? RANK_COLORS[i] : "text-white/80"
                    )}
                  >
                    {p.name}
                  </p>
                  <p className="text-[9px] text-white/30">
                    Lv {p.level} &middot; P{p.prestigeLevel} &middot; {p.carCount} cars
                  </p>
                </div>

                {/* Cash */}
                <div className="text-right">
                  <p
                    className={cn(
                      "font-display text-sm font-black",
                      isTop3 ? "text-amber-400" : "text-white/70"
                    )}
                  >
                    {fmtMoney(p.cash)}
                  </p>
                  <p className="text-[9px] text-white/25">
                    earned {fmtMoney(p.totalEarned)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
