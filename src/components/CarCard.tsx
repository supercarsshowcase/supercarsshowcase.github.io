import { memo, useCallback } from "react";
import { Link } from "react-router";
import { Heart, Gauge, Timer, Zap } from "lucide-react";
import type { Car } from "@/lib/types";
import { getCarImage } from "@/data/images";
import { useApp } from "@/context/app-context";
import { formatPriceCompact, formatNumber } from "@/lib/format";
import { SmartImage } from "./SmartImage";
import { cn } from "@/lib/utils";

export const CarCard = memo(function CarCard({ car }: { car: Car }) {
  const { currency, isFavorite, toggleFavorite } = useApp();
  const favorite = isFavorite(car.slug);
  const handleFav = useCallback(() => toggleFavorite(car.slug), [toggleFavorite, car.slug]);

  return (
    <Link
      to={`/cars/${car.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-apex-line bg-apex-panel transition-all duration-300 hover:-translate-y-1 hover:border-apex-line-strong hover:shadow-[0_24px_60px_-24px_rgba(255,46,0,0.35)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <SmartImage
          src={getCarImage(car)}
          alt={`${car.brand} ${car.model}`}
          sublabel={car.model}
          accent="#ff2e00"
          seed={car.slug}
          className="h-full w-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-apex-panel via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
          {car.category}
        </span>
        <button
          type="button"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFav();
          }}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur transition-colors hover:border-apex-red"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              favorite && "fill-apex-red text-apex-red",
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            {car.brand} · {car.year}
          </span>
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-apex-red">
            {formatNumber(car.horsepower)} HP
          </span>
        </div>
        <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight text-white">
          {car.model}
        </h3>

        <div className="mt-1 flex items-center gap-4 text-[11px] text-apex-muted">
          <span className="flex items-center gap-1">
            <Gauge className="size-3.5" />
            {formatNumber(car.topSpeedKmh)} km/h
          </span>
          <span className="flex items-center gap-1">
            <Timer className="size-3.5" />
            {car.zeroToHundredKmh}s
          </span>
          <span className="flex items-center gap-1">
            <Zap className="size-3.5" />
            {formatNumber(car.horsepower)}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between border-t border-apex-line pt-3">
          <span className="font-display text-xl font-black tracking-tight text-apex-red">
            {formatPriceCompact(car.priceUSD, currency)}
          </span>
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 transition-colors group-hover:text-apex-red">
            Inspect →
          </span>
        </div>
      </div>
    </Link>
  );
});
