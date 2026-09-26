import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Crown, Heart } from "lucide-react";
import { getCarImage } from "@/data/images";
import { useApp } from "@/context/app-context";
import { formatNumber, formatPriceCompact } from "@/lib/format";
import {
  RANK_BOARDS,
  rankBoard,
  rankCars,
  scalePct,
  leaderMargin,
  type RankBoard,
  type RankBoardId,
} from "@/lib/rankings";
import { SmartImage } from "@/components/SmartImage";
import { cn } from "@/lib/utils";
import type { Car, CurrencyCode } from "@/lib/types";

/** One snippet per board for the #1-vs-#2 margin sentence. */
const BOARD_LEAD_VERB: Record<RankBoardId, string> = {
  fastest: "leads the pack by",
  quickest: "launches",
  powerful: "outguns",
  expensive: "outsells",
};

/** Completes the sentence for verb forms that need a different connective. */
const BOARD_LEAD_SUFFIX: Record<RankBoardId, string> = {
  fastest: "over",
  quickest: "quicker than",
  powerful: "by",
  expensive: "by",
};

/** Favorites heart — same non-navigating pattern as CarCard. */
function FavButton({
  slug,
  favorite,
  onToggle,
  className,
}: {
  slug: string;
  favorite: boolean;
  onToggle: (slug: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(slug);
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur transition-colors hover:border-apex-red",
        className,
      )}
    >
      <Heart className={cn("size-4 transition-colors", favorite && "fill-apex-red text-apex-red")} />
    </button>
  );
}

/** Bar scaled against the board leader — leader always fills 100%. */
function LeaderBar({ pct, champion }: { pct: number; champion?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          champion ? "bg-apex-red shadow-[0_0_12px_rgba(255,46,0,0.6)]" : "bg-apex-red/70",
        )}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );
}

/** Podium card — champion styled, silver/bronze cards render beside it on md+. */
function PodiumCard({
  car,
  rank,
  board,
  currency,
  favorite,
  onToggleFavorite,
  leaderValue,
}: {
  car: Car;
  rank: 1 | 2 | 3;
  board: RankBoard;
  currency: CurrencyCode;
  favorite: boolean;
  onToggleFavorite: (slug: string) => void;
  leaderValue: number;
}) {
  const champion = rank === 1;
  return (
    <Link
      to={`/cars/${car.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-apex-panel transition-all duration-300 hover:-translate-y-1",
        champion
          ? "border-apex-red/60 shadow-[0_24px_70px_-28px_rgba(255,46,0,0.55)]"
          : "border-apex-line hover:border-apex-line-strong",
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <SmartImage
          src={getCarImage(car)}
          alt={`${car.brand} ${car.model}`}
          sublabel={car.model}
          accent="#ff2e00"
          seed={car.slug}
          className="h-full w-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-apex-panel via-transparent to-transparent" />
        {champion ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-apex-red px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(255,46,0,0.5)]">
            <Crown className="size-3.5" /> Champion
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
            #{rank}
          </span>
        )}
        <FavButton slug={car.slug} favorite={favorite} onToggle={onToggleFavorite} className="absolute right-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {car.brand} · {car.year}
          </p>
          <h3 className="truncate font-display text-lg font-extrabold tracking-tight text-white">
            {car.model}
          </h3>
        </div>
        <p className="font-display text-2xl font-black tracking-tight text-apex-red">
          {board.format(board.value(car), currency)}
        </p>
        <LeaderBar pct={scalePct(board.value(car), leaderValue, board.direction)} champion={champion} />
        <div className="mt-auto flex items-center gap-3 text-[11px] text-apex-muted">
          <span>{formatNumber(car.horsepower)} hp</span>
          <span>·</span>
          <span>{formatNumber(car.topSpeedKmh)} km/h</span>
        </div>
      </div>
    </Link>
  );
}

/** Compact ranked row for places 4–10. */
function RankedRow({
  car,
  rank,
  board,
  currency,
  favorite,
  onToggleFavorite,
  leaderValue,
}: {
  car: Car;
  rank: number;
  board: RankBoard;
  currency: CurrencyCode;
  favorite: boolean;
  onToggleFavorite: (slug: string) => void;
  leaderValue: number;
}) {
  return (
    <Link
      to={`/cars/${car.slug}`}
      className="group flex items-center gap-3 rounded-lg border border-apex-line bg-apex-panel p-3 transition-all hover:-translate-y-0.5 hover:border-apex-line-strong sm:gap-4 sm:p-3.5"
    >
      <span className="w-8 shrink-0 text-center font-display text-xl font-black tracking-tight text-white/25 sm:text-2xl">
        {rank}
      </span>
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md sm:h-14 sm:w-20">
        <SmartImage
          src={getCarImage(car)}
          alt={`${car.brand} ${car.model}`}
          label={car.brand}
          sublabel=""
          seed={car.slug}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {car.brand} · {car.year}
            </p>
            <h3 className="truncate font-display text-sm font-extrabold tracking-tight text-white sm:text-base">
              {car.model}
            </h3>
          </div>
          <FavButton
            slug={car.slug}
            favorite={favorite}
            onToggle={onToggleFavorite}
            className="size-7 shrink-0"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <LeaderBar pct={scalePct(board.value(car), leaderValue, board.direction)} />
          <span className="w-20 shrink-0 text-right font-display text-xs font-black tabular-nums text-white/70">
            {Math.round(scalePct(board.value(car), leaderValue, board.direction))}%
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap font-display text-sm font-black tracking-tight text-apex-red sm:text-lg">
          {board.format(board.value(car), currency)}
        </p>
      </div>
      <ArrowRight className="hidden size-4 shrink-0 text-white/25 transition-colors group-hover:text-apex-red sm:block" />
    </Link>
  );
}

export default function Rankings() {
  const { currency, isFavorite, toggleFavorite } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-linkable board: /rankings?board=quickest. Unknown values fall back
  // to the first board instead of crashing the page.
  const raw = searchParams.get("board");
  const boardId: RankBoardId = RANK_BOARDS.some((b) => b.id === raw)
    ? (raw as RankBoardId)
    : "fastest";
  const board = rankBoard(boardId);

  const ranked = useMemo(() => rankCars(boardId, 10), [boardId]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const leader = ranked[0];
  const leaderValue = leader ? board.value(leader) : 0;
  const runnerUp = ranked[1];
  const margin = leader && runnerUp ? leaderMargin(board, leader, runnerUp) : 0;

  const selectBoard = (id: RankBoardId) => {
    setSearchParams({ board: id }, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      {/* Header + board tabs */}
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Leaderboards
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            THE RANKINGS
          </h1>
          <p className="mt-3 max-w-lg text-sm text-apex-muted">
            The quickest, the fastest and the most valuable machines in the
            archive, ranked board by board.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANK_BOARDS.map((b) => {
            const Icon = b.icon;
            const active = b.id === boardId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBoard(b.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-display text-[12px] font-bold uppercase tracking-[0.14em] transition-all",
                  active
                    ? "border-apex-red bg-apex-red/10 text-white shadow-[0_0_18px_rgba(255,46,0,0.25)]"
                    : "border-apex-line bg-apex-panel text-white/45 hover:border-apex-line-strong hover:text-white",
                )}
              >
                <Icon className={cn("size-3.5", active ? "text-apex-red" : "text-white/35")} />
                {b.label}
              </button>
            );
          })}
        </div>

                {margin > 0 && leader && runnerUp && (
          <p className="text-xs text-apex-muted">
            <span className="font-display font-bold uppercase tracking-[0.14em] text-white">
              {leader.brand} {leader.model}
            </span>{" "}
            {BOARD_LEAD_VERB[boardId]}{" "}
            <span className="font-display font-bold text-apex-red">
              {board.format(margin, currency)}
            </span>{" "}
            {BOARD_LEAD_SUFFIX[boardId]} the {runnerUp.brand} {runnerUp.model}.
          </p>
        )}
      </div>

      {/* Podium — 2nd · 1st · 3rd on desktop, 1-2-3 on mobile */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {podium.map((car, i) => {
          const rank = (i + 1) as 1 | 2 | 3;
          // DOM order 1,2,3; on lg the champion moves to the middle.
          const orderClass =
            rank === 1 ? "lg:order-2" : rank === 2 ? "lg:order-1" : "lg:order-3";
          return (
            <div key={car.slug} className={cn(orderClass, rank === 1 && "sm:col-span-2 lg:col-span-1")}>
              <PodiumCard
                car={car}
                rank={rank}
                board={board}
                currency={currency}
                favorite={isFavorite(car.slug)}
                onToggleFavorite={toggleFavorite}
                leaderValue={leaderValue}
              />
            </div>
          );
        })}
      </div>

      {/* Places 4–10 */}
      <div className="flex flex-col gap-2.5">
        {rest.map((car, i) => (
          <RankedRow
            key={car.slug}
            car={car}
            rank={i + 4}
            board={board}
            currency={currency}
            favorite={isFavorite(car.slug)}
            onToggleFavorite={toggleFavorite}
            leaderValue={leaderValue}
          />
        ))}
      </div>
    </div>
  );
}
