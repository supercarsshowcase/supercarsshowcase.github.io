import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Car, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, levelFrom } from "@/game/data";
import { passivePerSec } from "@/game/engine";
import type { GameState } from "@/game/types";

type SortKey = "cash" | "earned" | "level" | "cars";

function CashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

const SORTS: { key: SortKey; label: string; icon: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "cash", label: "Cash", icon: CashIcon },
  { key: "earned", label: "Earned", icon: (p) => <TrendingUp {...p} /> },
  { key: "level", label: "Level", icon: (p) => <Star {...p} /> },
  { key: "cars", label: "Garage", icon: (p) => <Car {...p} /> },
];

const SORT_HINT: Record<SortKey, string> = {
  cash: "who's holding the most right now",
  earned: "career earnings — the grind board",
  level: "highest level & prestige",
  cars: "biggest car collections",
};

function SectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="mb-4 md:mb-6">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">{eyebrow}</p>
      <h3 className="mt-1 font-display text-xl font-black tracking-tight text-white md:text-2xl">{title}</h3>
      {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}

type Row = {
  rank: number;
  userId: string;
  name: string;
  cash: number;
  totalEarned: number;
  level: number;
  prestigeLevel: number;
  carCount: number;
};

function valueOf(r: Row, sort: SortKey): number {
  if (sort === "cash") return r.cash;
  if (sort === "earned") return r.totalEarned;
  if (sort === "level") return r.level;
  return r.carCount;
}

function valueLabel(r: Row, sort: SortKey): string {
  if (sort === "cars") return `${r.carCount} cars`;
  if (sort === "level") return `Lv ${r.level}`;
  return fmtMoney(valueOf(r, sort));
}

/* Avatar initials from a player name — deterministic, no images needed. */
function initials(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const clean = name.replace(/[^a-z0-9]/gi, "");
  return (clean.slice(0, 2) || "??").toUpperCase();
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 ring-1 ring-amber-400/40">
        <Crown className="size-3.5 text-amber-400" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-300/10 ring-1 ring-slate-300/30">
        <Medal className="size-3.5 text-slate-300" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-700/15 ring-1 ring-amber-700/40">
        <Medal className="size-3.5 text-amber-600" />
      </span>
    );
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-display text-xs font-black tabular-nums text-white/45">
      {rank}
    </span>
  );
}

const PODIUM_META = [
  { ring: "ring-amber-400/50", chip: "bg-amber-400/15 text-amber-300", label: "text-amber-300", icon: Crown, lift: "sm:-mt-5" },
  { ring: "ring-slate-300/40", chip: "bg-slate-300/10 text-slate-200", label: "text-slate-200", icon: Medal, lift: "" },
  { ring: "ring-amber-700/50", chip: "bg-amber-700/15 text-amber-500", label: "text-amber-500", icon: Medal, lift: "" },
] as const;

function Podium({ rows, sort, myUserId }: { rows: Row[]; sort: SortKey; myUserId?: string }) {
  const spots: (Row | null)[] = [rows[1] ?? null, rows[0] ?? null, rows[2] ?? null];
  return (
    <div className="mb-4 grid grid-cols-3 items-end gap-2 md:mb-6 md:gap-3">
      {spots.map((row, position) => {
        if (!row) {
          return <div key={`empty-${position}`} className="rounded-xl border border-dashed border-apex-line bg-apex-panel/40 py-8 md:py-10" />;
        }
        const idx = position === 1 ? 0 : position === 0 ? 1 : 2;
        const meta = PODIUM_META[idx];
        const Icon = meta.icon;
        const isMe = myUserId !== undefined && row.userId === myUserId;
        return (
          <div key={row.userId} className={meta.lift}>
            <div className={cn(
              "relative rounded-xl border bg-apex-panel p-3 text-center ring-1 md:p-4",
              meta.ring,
              position === 1 ? "border-apex-line-strong" : "border-apex-line",
              isMe && "outline outline-1 outline-apex-red/60",
            )}>
              {isMe && (
                <span className="absolute right-1.5 top-1.5 rounded bg-apex-red px-1 py-px text-[8px] font-black uppercase text-white">You</span>
              )}
              <Icon className={cn("mx-auto mb-2 size-4", meta.label)} />
              <div className={cn("mx-auto mb-2 flex size-10 items-center justify-center rounded-full font-display text-sm font-black md:size-12 md:text-base", meta.chip)}>
                {initials(row.name)}
              </div>
              <p className={cn("truncate font-display text-xs font-bold md:text-sm", meta.label)}>{row.name}</p>
              <p className="mt-1 font-display text-sm font-black tabular-nums text-white md:text-base">{valueLabel(row, sort)}</p>
              <p className="mt-0.5 text-[10px] text-white/30">
                {sort === "cash" ? `Lv ${row.level} · ${row.carCount} cars` : `${fmtMoney(row.cash)} cash`}
              </p>
              <span className={cn("mt-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", meta.chip)}>
                #{row.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-apex-line bg-apex-panel p-3 text-center md:p-4">
      <Icon className={cn("mx-auto mb-2 size-4", accent ? "text-apex-red/60" : "text-white/30")} />
      <p className={cn("font-display text-lg font-black md:text-xl", accent ? "text-apex-red" : "text-white")}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">{label}</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border border-apex-line">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-apex-panel px-3 py-3 md:px-4">
          <div className="size-7 shrink-0 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-2 w-1/4 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-3 w-14 shrink-0 animate-pulse rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardPanel({ state }: { state: GameState }) {
  const [sort, setSort] = useState<SortKey>("cash");
  const players = useQuery(api.leaderboard.getTopPlayers, { sort });
  const myRank = useQuery(api.leaderboard.getMyRank, { sort });
  const stats = useQuery(api.leaderboard.getBoardStats, {});

  const myStats = useMemo(() => {
    if (!state) return null;
    return {
      level: levelFrom(state),
      prestige: state.prestigeLevel,
      cars: Object.keys(state.ownedCars).length,
      income: passivePerSec(state),
    };
  }, [state]);

  const podium = players?.slice(0, 3) ?? [];
  const rest = players?.slice(3) ?? [];

  return (
    <div>
      <SectionHeader
        eyebrow="Rankings"
        title="LEADERBOARD"
        hint="Top 100 · entries idle for 7+ days are hidden"
      />

      {/* Sort tabs */}
      <div className="mb-4 grid grid-cols-4 gap-1.5 rounded-xl border border-apex-line bg-apex-panel p-1.5 md:mb-6">
        {SORTS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            title={SORT_HINT[key]}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] transition-colors md:text-xs",
              sort === key
                ? "bg-apex-red text-white shadow-lg shadow-apex-red/25"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="-mt-2 mb-4 text-[11px] italic text-white/25 md:hidden">{SORT_HINT[sort]}</p>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-3 gap-2 md:mb-6 md:gap-3">
        <StatCard icon={Users} label="Players" value={stats ? stats.players.toLocaleString() : "—"} />
        <StatCard icon={TrendingUp} label="Top Cash" value={stats ? fmtMoney(stats.topCash) : "—"} accent />
        <StatCard icon={Car} label="Total Cars" value={stats ? stats.totalCars.toLocaleString() : "—"} />
      </div>

      {/* Podium (only when the list has loaded and has entries) */}
      {players !== undefined && podium.length > 0 && <Podium rows={podium} sort={sort} myUserId={myRank?.userId} />}

      {/* Your position card */}
      {myRank && (
        <div className="mb-4 overflow-hidden rounded-xl border border-apex-red/30 bg-gradient-to-r from-apex-red/10 to-transparent md:mb-6">
          <div className="flex items-center gap-3 px-3 py-3 md:gap-4 md:px-5 md:py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-apex-red/30 bg-apex-red/15 font-display text-base font-black text-apex-red md:size-12 md:text-lg">
              #{myRank.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-apex-red">Your Position</p>
              <p className="mt-0.5 truncate font-display text-base font-black text-white md:text-lg">{myRank.name}</p>
              {myStats && (
                <p className="mt-0.5 text-[11px] text-white/35">
                  Lv {myStats.level} · P{myStats.prestige} · {myStats.cars} cars · +{fmtMoney(myStats.income)}/s
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-black text-apex-red md:text-xl">
                {sort === "cars"
                  ? myRank.carCount.toLocaleString()
                  : sort === "level"
                    ? myRank.level.toLocaleString()
                    : fmtMoney(sort === "earned" ? myRank.totalEarned : myRank.cash)}
              </p>
              <p className="text-[10px] text-white/30 md:text-[11px]">
                {sort === "cash" ? "in your account" : sort === "earned" ? "career earnings" : sort === "level" ? "your level" : "cars owned"}
              </p>
            </div>
          </div>
        </div>
      )}
      {players !== undefined && !myRank && (
        <div className="mb-4 rounded-xl border border-dashed border-apex-line bg-apex-panel/50 px-4 py-3 text-center md:mb-6">
          <p className="text-xs text-white/35">
            You're not ranked yet — your stats sync to the board within 30 seconds of playing.
          </p>
        </div>
      )}

      {/* List */}
      {players === undefined ? (
        <SkeletonRows />
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-apex-line bg-apex-panel py-16 text-center">
          <Trophy className="mx-auto size-12 text-white/10" />
          <p className="mt-4 font-display text-sm font-bold text-white/40">No players yet</p>
          <p className="mt-1 text-[11px] text-white/20">Play the game to appear on the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-px overflow-hidden rounded-xl border border-apex-line bg-apex-line">
          {/* Column header — desktop only; mobile rows are self-describing */}
          <div className="hidden grid-cols-[3rem_1fr_6.5rem_6.5rem_3.5rem_3.5rem] gap-3 bg-[#0a0a0c] px-4 py-2.5 md:grid">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">#</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Player</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Cash</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Earned</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Lv</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Cars</span>
          </div>

          {rest.length === 0 && podium.length > 0 && (
            <div className="bg-[#0c0c0e] px-4 py-3 text-center text-[11px] text-white/25">
              That's the whole board for now — fewer than 4 ranked players.
            </div>
          )}

          {rest.map((p) => {
            const isMe = myRank != null && p.userId === myRank.userId;
            return (
              <div
                key={p.userId}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-3 py-2.5 transition-colors md:grid-cols-[3rem_1fr_6.5rem_6.5rem_3.5rem_3.5rem] md:gap-3 md:px-4 md:py-3",
                  isMe ? "bg-apex-red/[0.08] ring-1 ring-inset ring-apex-red/30" : "bg-[#0c0c0e] hover:bg-white/[0.02]",
                )}
              >
                <RankBadge rank={p.rank} />

                {/* Name + meta */}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-display text-sm font-bold text-white/80">
                    <span className="truncate">{p.name}</span>
                    {p.prestigeLevel > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-apex-red/15 px-1 py-px text-[9px] font-black text-apex-red">
                        <Flame className="size-2.5" />
                        {p.prestigeLevel}
                      </span>
                    )}
                    {isMe && (
                      <span className="shrink-0 rounded bg-apex-red px-1 py-px text-[9px] font-black uppercase text-white">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/25 md:hidden">
                    Lv {p.level} · {p.carCount} cars{sort !== "cash" ? ` · ${fmtMoney(p.cash)} cash` : ""}
                  </p>
                </div>

                {/* Cash */}
                <div className="text-right">
                  <p className="font-display text-sm font-black tabular-nums text-amber-300/90">{fmtMoney(p.cash)}</p>
                </div>

                {/* Earned (desktop) */}
                <div className="hidden text-right md:block">
                  <p className="text-[11px] tabular-nums text-white/30">{fmtMoney(p.totalEarned)}</p>
                </div>

                {/* Level (desktop) */}
                <div className="hidden text-right md:block">
                  <p className="text-[11px] tabular-nums text-white/50">{p.level}</p>
                </div>

                {/* Cars (desktop) */}
                <div className="hidden text-right md:block">
                  <p className="text-[11px] tabular-nums text-white/50">{p.carCount}</p>
                </div>
              </div>
            );
          })}

          {players.length >= 100 && (
            <div className="bg-[#0a0a0c] px-4 py-3 text-center">
              <p className="text-[11px] text-white/20">Showing top 100 players</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
