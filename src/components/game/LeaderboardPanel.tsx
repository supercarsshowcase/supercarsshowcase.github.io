import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Car } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function SectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">{eyebrow}</p>
      <h3 className="mt-1 font-display text-2xl font-black tracking-tight text-white">{title}</h3>
      {hint && <p className="mt-1 text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

const RANK_STYLES = [
  { bg: "bg-gradient-to-r from-amber-500/20 to-amber-600/10", border: "border-amber-500/30", text: "text-amber-400", icon: Crown, glow: "shadow-amber-500/20" },
  { bg: "bg-gradient-to-r from-gray-400/15 to-gray-500/5", border: "border-gray-400/20", text: "text-gray-300", icon: Medal, glow: "" },
  { bg: "bg-gradient-to-r from-amber-700/15 to-amber-800/5", border: "border-amber-700/20", text: "text-amber-600", icon: Star, glow: "" },
];

export function LeaderboardPanel() {
  const players = useQuery(api.leaderboard.getTopPlayers);
  const myRank = useQuery(api.leaderboard.getMyRank);

  const totalPlayers = players?.length ?? 0;
  const topCash = players?.[0]?.cash ?? 0;

  return (
    <div>
      <SectionHeader
        eyebrow="Rankings"
        title="LEADERBOARD"
        hint="Top players by total cash. Score updates automatically."
      />

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-apex-line bg-apex-panel p-4 text-center">
          <Users className="mx-auto mb-2 size-4 text-white/30" />
          <p className="font-display text-lg font-black text-white">{totalPlayers}</p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/30">Players</p>
        </div>
        <div className="rounded-xl border border-apex-line bg-apex-panel p-4 text-center">
          <TrendingUp className="mx-auto mb-2 size-4 text-apex-red/60" />
          <p className="font-display text-lg font-black text-apex-red">{fmtMoney(topCash)}</p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/30">Top Cash</p>
        </div>
        <div className="rounded-xl border border-apex-line bg-apex-panel p-4 text-center">
          <Car className="mx-auto mb-2 size-4 text-white/30" />
          <p className="font-display text-lg font-black text-white">
            {players ? players.reduce((s, p) => s + p.carCount, 0) : 0}
          </p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/30">Total Cars</p>
        </div>
      </div>

      {/* Your rank card */}
      {myRank && (
        <div className="mb-6 overflow-hidden rounded-xl border border-apex-red/30 bg-gradient-to-r from-apex-red/10 to-transparent">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-apex-red/30 bg-apex-red/15 font-display text-lg font-black text-apex-red">
              #{myRank.rank}
            </div>
            <div className="flex-1">
              <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-apex-red">Your Position</p>
              <p className="mt-0.5 font-display text-lg font-black text-white">{myRank.name}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-black text-apex-red">{fmtMoney(myRank.cash)}</p>
              <p className="text-[9px] text-white/30">in your account</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      {players === undefined ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-2 border-apex-red border-t-transparent" />
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-apex-line bg-apex-panel py-16 text-center">
          <Trophy className="mx-auto size-12 text-white/10" />
          <p className="mt-4 font-display text-sm font-bold text-white/40">No players yet</p>
          <p className="mt-1 text-[10px] text-white/20">Play the game to appear on the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-px overflow-hidden rounded-xl border border-apex-line bg-apex-line">
          {/* Header row */}
          <div className="grid grid-cols-[3rem_1fr_8rem_6rem] gap-3 bg-[#0a0a0c] px-4 py-2.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25">#</span>
            <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25">Player</span>
            <span className="text-right text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25">Cash</span>
            <span className="text-right text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25">Earned</span>
          </div>

          {players.map((p, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const style = isTop3 ? RANK_STYLES[i] : null;
            const RankIcon = style?.icon ?? null;

            return (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[3rem_1fr_8rem_6rem] items-center gap-3 px-4 py-3 transition-colors",
                  isTop3
                    ? cn(style!.bg, "border-l-2", style!.border.replace("border-", "border-l-"))
                    : "bg-[#0c0c0e] hover:bg-white/[0.02]"
                )}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {RankIcon ? (
                    <div className={cn("flex size-7 items-center justify-center rounded-md", style!.bg)}>
                      <RankIcon className={cn("size-3.5", style!.text)} />
                    </div>
                  ) : (
                    <span className={cn(
                      "font-display text-xs font-black tabular-nums",
                      rank <= 10 ? "text-white/60" : "text-white/30"
                    )}>
                      {rank}
                    </span>
                  )}
                </div>

                {/* Name + stats */}
                <div className="min-w-0">
                  <p className={cn(
                    "truncate font-display text-sm font-bold",
                    isTop3 ? style!.text : "text-white/80"
                  )}>
                    {p.name}
                  </p>
                  <p className="text-[9px] text-white/25">
                    Lv {p.level} &middot; P{p.prestigeLevel} &middot; {p.carCount} cars
                  </p>
                </div>

                {/* Cash */}
                <div className="text-right">
                  <p className={cn(
                    "font-display text-sm font-black tabular-nums",
                    isTop3 ? "text-amber-400" : "text-white/70"
                  )}>
                    {fmtMoney(p.cash)}
                  </p>
                </div>

                {/* Total earned */}
                <div className="text-right">
                  <p className="text-[10px] text-white/30 tabular-nums">
                    {fmtMoney(p.totalEarned)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {totalPlayers >= 100 && (
            <div className="bg-[#0a0a0c] px-4 py-3 text-center">
              <p className="text-[9px] text-white/20">Showing top 100 players</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
