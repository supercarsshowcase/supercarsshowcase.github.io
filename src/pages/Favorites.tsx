import { Link } from "react-router";
import { Heart, Trash2, ArrowRight } from "lucide-react";
import { CARS, carBySlug } from "@/data/cars";
import { useApp } from "@/context/app-context";
import { CarCard } from "@/components/CarCard";

export default function Favorites() {
  const { favorites, clearFavorites } = useApp();
  const cars = favorites
    .map((slug) => carBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Your collection
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            FAVORITES
          </h1>
        </div>
        {cars.length > 0 && (
          <button
            type="button"
            onClick={clearFavorites}
            className="inline-flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-apex-red"
          >
            <Trash2 className="size-4" /> Clear all
          </button>
        )}
      </div>

      {cars.length > 0 ? (
        <>
          <p className="mb-8 text-sm text-apex-muted">
            <span className="font-display text-xl font-black text-white">
              {cars.length}
            </span>{" "}
            {cars.length === 1 ? "machine" : "machines"} saved in your garage.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cars.map((car) => (
              <CarCard key={car.slug} car={car} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-apex-line bg-apex-panel/40 px-6 py-24 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-apex-red/10">
            <Heart className="size-7 text-apex-red" />
          </span>
          <h2 className="mt-6 font-display text-2xl font-black text-white">
            YOUR GARAGE IS EMPTY
          </h2>
          <p className="mt-2 max-w-sm text-sm text-apex-muted">
            Tap the heart on any machine to build your own personal collection
            of dream cars.
          </p>
          <Link
            to="/garage"
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-apex-red px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright"
          >
            Browse the garage
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
