import { useMemo, useState } from "react";
import { Search, ChevronDown, RotateCcw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { carsList, brandNames, categories } from "@/data/cars";
import { useApp } from "@/context/app-context";
import { formatPriceCompact } from "@/lib/format";
import { CarCard } from "@/components/CarCard";
import { Slider } from "@/components/ui/slider";
import { GARAGE_COPY, tmpl } from "@/data/page-copy";
import type { Car, SortMode } from "@/lib/types";

const PRICE_MAX = 50_000_000;

// ── Derived rarities from production counts ──
const PROD_UNITS: Record<string, number> = {};
for (const c of carsList()) {
  const m = c.production.match(/(\d+)\s*units?/i);
  PROD_UNITS[c.slug] = m ? parseInt(m[1]) : Infinity;
}

function getRarity(car: Car): string {
  const u = PROD_UNITS[car.slug];
  if (u <= 15) return "Ultra Rare";
  if (u <= 60) return "Limited";
  if (u <= 500) return "Exclusive";
  if (u < 10_000) return "Production";
  return "Mass Production";
}

const RARITIES = ["All Rarities", "Ultra Rare", "Limited", "Exclusive", "Production", "Mass Production"];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-desc", label: "Price • High → Low" },
  { value: "price-asc", label: "Price • Low → High" },
  { value: "year-desc", label: "Year • Newest" },
  { value: "year-asc", label: "Year • Oldest" },
  { value: "speed-desc", label: "Top Speed • Fastest" },
  { value: "power-desc", label: "Power • Most HP" },
];

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-md border border-white/[0.08] bg-[#0b0b0c] px-4 pr-9 text-sm text-white outline-none transition-colors focus:border-apex-red"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#0b0b0c] text-white">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
    </div>
  );
}

export default function Garage() {
  const { currency } = useApp();
  const page = useQuery(api.pages.getPageContent, { page: "garage" });
  const copy = { ...GARAGE_COPY, ...(page ?? {}) };
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All Brands");
  const [category, setCategory] = useState("All Categories");
  const [rarity, setRarity] = useState("All Rarities");
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [sort, setSort] = useState<SortMode>("price-desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = carsList().filter((car) => {
      if (brand !== "All Brands" && car.brand !== brand) return false;
      if (category !== "All Categories" && car.category !== category) return false;
      if (rarity !== "All Rarities" && getRarity(car) !== rarity) return false;
      if (car.priceUSD > maxPrice) return false;
      if (q) {
        const haystack = `${car.brand} ${car.model} ${car.year} ${car.category} ${car.engine}`.toLowerCase();
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
  }, [query, brand, category, rarity, maxPrice, sort]);

  const reset = () => {
    setQuery("");
    setBrand("All Brands");
    setCategory("All Categories");
    setRarity("All Rarities");
    setMaxPrice(PRICE_MAX);
    setSort("price-desc");
  };

  return (
    <div className="mx-auto flex max-w-[1600px] gap-0 px-4 py-12 sm:px-6">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-[280px] shrink-0 border-r border-white/[0.06] pr-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            {copy.filtersLbl}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-apex-red"
          >
            <RotateCcw className="size-3" /> {copy.resetLbl}
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 space-y-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
            />
          </div>
        </div>

        {/* Brand */}
        <div className="mb-6 space-y-1.5">
          <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.brandLbl}</label>
          <Dropdown value={brand} onChange={setBrand} options={["All Brands", ...brandNames]} />
        </div>

        {/* Category */}
        <div className="mb-6 space-y-1.5">
          <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.categoryLbl}</label>
          <Dropdown value={category} onChange={setCategory} options={["All Categories", ...categories]} />
        </div>

        {/* Rarity */}
        <div className="mb-6 space-y-1.5">
          <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.rarityLbl}</label>
          <Dropdown value={rarity} onChange={setRarity} options={RARITIES} />
        </div>

        {/* Max Price */}
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.priceLbl}</label>
            <span className="font-display text-[11px] font-bold text-apex-red">
              {maxPrice >= PRICE_MAX
                ? formatPriceCompact(PRICE_MAX, currency)
                : formatPriceCompact(maxPrice, currency)}
            </span>
          </div>
          <Slider
            value={[maxPrice]}
            min={0}
            max={PRICE_MAX}
            step={250_000}
            onValueChange={([v]) => setMaxPrice(v)}
            className="[&_[data-slot=slider-range]]:bg-apex-red [&_[data-slot=slider-thumb]]:border-apex-red"
          />
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.sortLbl}</label>
          <Dropdown
            value={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Price • High → Low"}
            onChange={(v) => {
              const opt = SORT_OPTIONS.find((o) => o.label === v);
              if (opt) setSort(opt.value);
            }}
            options={SORT_OPTIONS.map((o) => o.label)}
          />
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="min-w-0 flex-1 pl-8">
        {/* Top header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              <span className="inline-block size-1.5 rounded-full bg-apex-red" /> {copy.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white/90 sm:text-5xl">
              {tmpl(copy.heading, { n: carsList().length })}
            </h1>
          </div>
          <span className="shrink-0 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/25">
            {tmpl(copy.resultsLbl, { n: filtered.length })}
          </span>
        </div>

        {/* Grid or empty */}
        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((car) => (
              <CarCard key={car.slug} car={car} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#0b0b0c] px-6 py-32 text-center">
            <p className="font-display text-3xl font-black text-white">
              {copy.emptyTitle}
            </p>
            <p className="mt-3 text-sm text-white/40">
              {copy.emptyBody}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-8 rounded-md bg-apex-red px-6 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright"
            >
              {copy.clearLbl}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}