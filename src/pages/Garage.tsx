import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CARS, brandNames, categories } from "@/data/cars";
import { useApp } from "@/context/app-context";
import { formatPriceCompact, formatNumber } from "@/lib/format";
import { CarCard } from "@/components/CarCard";
import { Slider } from "@/components/ui/slider";
import type { SortMode } from "@/lib/types";

const PRICE_MAX = 50_000_000;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "year-desc", label: "Year: Newest" },
  { value: "year-asc", label: "Year: Oldest" },
  { value: "speed-desc", label: "Top Speed: Fastest" },
  { value: "power-desc", label: "Power: Most HP" },
];

export default function Garage() {
  const { currency } = useApp();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_MAX]);
  const [sort, setSort] = useState<SortMode>("featured");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = CARS.filter((car) => {
      if (brand !== "All" && car.brand !== brand) return false;
      if (category !== "All" && car.category !== category) return false;
      if (car.priceUSD < priceRange[0] || car.priceUSD > priceRange[1])
        return false;
      if (q) {
        const haystack =
          `${car.brand} ${car.model} ${car.year} ${car.category} ${car.engine}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    switch (sort) {
      case "price-desc":
        list = [...list].sort((a, b) => b.priceUSD - a.priceUSD);
        break;
      case "price-asc":
        list = [...list].sort((a, b) => a.priceUSD - b.priceUSD);
        break;
      case "year-desc":
        list = [...list].sort((a, b) => b.year - a.year);
        break;
      case "year-asc":
        list = [...list].sort((a, b) => a.year - b.year);
        break;
      case "speed-desc":
        list = [...list].sort((a, b) => b.topSpeedKmh - a.topSpeedKmh);
        break;
      case "power-desc":
        list = [...list].sort((a, b) => b.horsepower - a.horsepower);
        break;
      default:
        break;
    }
    return list;
  }, [query, brand, category, priceRange, sort]);

  const hasFilters =
    query || brand !== "All" || category !== "All" || priceRange[0] > 0 || priceRange[1] < PRICE_MAX;

  const reset = () => {
    setQuery("");
    setBrand("All");
    setCategory("All");
    setPriceRange([0, PRICE_MAX]);
    setSort("featured");
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            The archive
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
            THE GARAGE
          </h1>
        </div>
        <p className="text-sm text-apex-muted">
          <span className="font-display text-xl font-black text-white">
            {filtered.length}
          </span>{" "}
          of {CARS.length} machines
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-10 rounded-lg border border-apex-line bg-apex-panel p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Bugatti, Chiron, V12, Hypercar…"
              className="h-11 w-full rounded-md border border-apex-line bg-black pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-apex-red"
            />
          </div>

          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by brand"
            className="h-11 cursor-pointer appearance-none rounded-md border border-apex-line bg-black px-4 pr-9 text-sm text-white outline-none focus:border-apex-red"
          >
            <option value="All">All Marques</option>
            {brandNames.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-11 cursor-pointer appearance-none rounded-md border border-apex-line bg-black px-4 pr-9 text-sm text-white outline-none focus:border-apex-red"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort cars"
            className="h-11 cursor-pointer appearance-none rounded-md border border-apex-line bg-black px-4 pr-9 text-sm text-white outline-none focus:border-apex-red"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price slider */}
        <div className="mt-5 flex items-center gap-4">
          <SlidersHorizontal className="size-4 shrink-0 text-white/40" />
          <div className="flex-1">
            <Slider
              value={priceRange}
              min={0}
              max={PRICE_MAX}
              step={250_000}
              minStepsBetweenThumbs={1}
              onValueChange={(val) =>
                setPriceRange([val[0], val[1]] as [number, number])
              }
              className="[&_[data-slot=slider-range]]:bg-apex-red [&_[data-slot=slider-thumb]]:border-apex-red"
            />
          </div>
          <span className="hidden w-44 shrink-0 text-right text-xs text-white/60 sm:block">
            {formatPriceCompact(priceRange[0], currency)} –{" "}
            {priceRange[1] >= PRICE_MAX
              ? formatPriceCompact(PRICE_MAX, currency) + "+"
              : formatPriceCompact(priceRange[1], currency)}
          </span>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-apex-red transition-colors hover:text-white"
          >
            <X className="size-3.5" /> Clear all filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((car) => (
            <CarCard key={car.slug} car={car} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-apex-line bg-apex-panel/40 px-6 py-24 text-center">
          <p className="font-display text-2xl font-black text-white">
            No machines found
          </p>
          <p className="mt-2 text-sm text-apex-muted">
            Try adjusting your filters or search query.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-apex-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
