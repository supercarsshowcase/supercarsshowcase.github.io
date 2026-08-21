import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Heart,
  Play,
  Share2,
  Scale,
  Check,
  Gauge,
  Timer,
  Zap,
  Weight,
  Cog,
  Fuel,
  CalendarDays,
  BookOpen,
  Globe,
} from "lucide-react";
import { carBySlug, carsByBrand } from "@/data/cars";
import { brandByName } from "@/data/brands";
import { getCarGallery } from "@/data/images";
import { useApp } from "@/context/app-context";
import {
  formatPriceFull,
  formatNumber,
  youtubeSearchUrl,
  wikipediaSearchUrl,
} from "@/lib/format";
import { SmartImage } from "@/components/SmartImage";
import { CarCard } from "@/components/CarCard";
import { cn } from "@/lib/utils";

const MANUFACTURER_SITES: Record<string, string> = {
  Bugatti: "https://www.bugatti.com",
  "Mercedes-AMG": "https://www.mercedes-amg.com",
  "BMW M": "https://www.bmw-m.com",
  Ferrari: "https://www.ferrari.com",
  Lamborghini: "https://www.lamborghini.com",
  Porsche: "https://www.porsche.com",
  McLaren: "https://cars.mclaren.com",
  "Aston Martin": "https://www.astonmartin.com",
  Koenigsegg: "https://www.koenigsegg.com",
  Pagani: "https://www.pagani.com",
  "Rolls-Royce": "https://www.rolls-roycemotorcars.com",
  Bentley: "https://www.bentleymotors.com",
  "Audi Sport": "https://www.audi.com",
  Jaguar: "https://www.jaguar.com",
  Maserati: "https://www.maserati.com",
  Lotus: "https://www.lotuscars.com",
  Rimac: "https://www.rimac-automobili.com",
  Hennessey: "https://www.hennesseyperformance.com",
};

function Spec({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-apex-line bg-apex-panel p-4">
      <div className="flex items-center gap-2 text-apex-muted">
        <Icon className="size-4 text-apex-red" />
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-extrabold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

export default function CarDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currency, isFavorite, toggleFavorite } = useApp();
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState(0);

  useEffect(() => {
    setActiveView(0);
    setCopied(false);
  }, [slug]);

  const car = slug ? carBySlug(slug) : undefined;
  const brand = car ? brandByName(car.brand) : undefined;

  const related = useMemo(
    () =>
      car
        ? carsByBrand(car.brand)
            .filter((c) => c.slug !== car.slug)
            .slice(0, 4)
        : [],
    [car],
  );

  if (!car) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center">
        <p className="font-display text-2xl font-black text-white">
          Machine not found
        </p>
        <Link
          to="/garage"
          className="mt-6 rounded-md bg-apex-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          Back to the garage
        </Link>
      </div>
    );
  }

  const gallery = getCarGallery(car);
  const favorite = isFavorite(car.slug);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${car.brand} ${car.model}`,
          text: `${car.brand} ${car.model} — ${formatNumber(car.horsepower)} hp, ${formatNumber(car.topSpeedKmh)} km/h.`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const trailerQuery = `${car.brand} ${car.model} ${car.year}`;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Breadcrumb / back */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/brands/${brand?.slug ?? ""}`}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-apex-red"
          >
            {car.brand}
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            {car.model}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Image gallery */}
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-apex-line bg-apex-panel">
            <SmartImage
              src={gallery[activeView]?.src ?? ""}
              alt={`${car.brand} ${car.model} — ${gallery[activeView]?.label ?? ""}`}
              label={car.brand}
              sublabel={`${car.model} · ${car.year}`}
              accent={brand?.accent ?? "#ff2e00"}
              seed={gallery[activeView]?.seed ?? car.slug}
              viewLabel={gallery[activeView]?.label}
              className="aspect-[16/10] w-full"
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {gallery.map((view, i) => (
              <button
                key={view.seed}
                type="button"
                onClick={() => setActiveView(i)}
                className={cn(
                  "relative overflow-hidden rounded-md border transition-colors",
                  i === activeView
                    ? "border-apex-red ring-1 ring-apex-red/50"
                    : "border-apex-line hover:border-apex-line-strong",
                )}
                aria-label={`View ${view.label}`}
              >
                <SmartImage
                  src={view.src}
                  alt={`${car.brand} ${car.model} — ${view.label}`}
                  label={car.brand}
                  accent={brand?.accent ?? "#ff2e00"}
                  seed={view.seed}
                  className="aspect-[16/10] w-full"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-3 text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-white/75">
                  {view.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="rounded-sm bg-apex-red/15 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-apex-red">
              {car.category}
            </span>
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {car.year}
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
            {car.brand}
            <br />
            {car.model}
          </h1>

          <p className="mt-5 font-display text-3xl font-black tracking-tight text-apex-red sm:text-4xl">
            {formatPriceFull(car.priceUSD, currency)}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-apex-muted">
            Estimated base price · not for sale
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => toggleFavorite(car.slug)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                favorite
                  ? "border-apex-red bg-apex-red/10 text-apex-red"
                  : "border-white/20 text-white/80 hover:border-apex-red hover:text-white",
              )}
            >
              <Heart className={cn("size-4", favorite && "fill-apex-red")} />
              {favorite ? "Favorited" : "Favorite"}
            </button>
            <Link
              to={`/compare?cars=${car.slug}`}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-apex-red hover:text-white"
            >
              <Scale className="size-4" /> Compare
            </Link>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-apex-red hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Share2 className="size-4" /> Share
                </>
              )}
            </button>
          </div>

          <p className="mt-6 border-t border-apex-line pt-6 text-sm leading-7 text-white/70">
            {car.description}
          </p>
        </div>
      </div>

      {/* Trailer */}
      <a
        href={youtubeSearchUrl(`${trailerQuery} cinematic review`)}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative mt-8 block overflow-hidden rounded-lg border border-apex-line"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a0a04] via-[#0d0d0f] to-black" />
        <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(115deg,transparent_0,transparent_40px,rgba(255,255,255,0.05)_41px,transparent_42px)]" />
        <div className="relative flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-apex-red text-white shadow-[0_0_60px_-8px_rgba(255,46,0,0.8)] transition-transform group-hover:scale-110">
            <Play className="ml-1 size-6 fill-white" />
          </span>
          <div>
            <p className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              WATCH ON YOUTUBE
            </p>
            <p className="mt-2 text-sm text-white/50">
              {car.brand} {car.model} {car.year} — hear the engine
            </p>
          </div>
        </div>
      </a>

      {/* Research links */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={wikipediaSearchUrl(`${car.brand} ${car.model}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-apex-line bg-apex-panel px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
        >
          <BookOpen className="size-4" /> Watch on Wikipedia
        </a>
        {MANUFACTURER_SITES[car.brand] && (
          <a
            href={MANUFACTURER_SITES[car.brand]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-apex-line bg-apex-panel px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
          >
            <Globe className="size-4" /> Manufacturer site
          </a>
        )}
      </div>

      {/* Specs */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black tracking-tight text-white">
          TELEMETRY
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Spec icon={Gauge} label="Top Speed" value={`${formatNumber(car.topSpeedKmh)} km/h`} />
          <Spec icon={Timer} label="0–100 km/h" value={`${car.zeroToHundredKmh}s`} />
          <Spec icon={Zap} label="Power" value={`${formatNumber(car.horsepower)} hp`} />
          <Spec icon={Cog} label="Torque" value={`${formatNumber(car.torqueNm)} Nm`} />
          <Spec icon={Weight} label="Weight" value={`${formatNumber(car.weightKg)} kg`} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Spec icon={Fuel} label="Engine" value={car.engine} />
          <Spec icon={Cog} label="Drivetrain" value={car.driveType} />
          <Spec icon={Cog} label="Transmission" value={car.transmission} />
          <Spec icon={CalendarDays} label="Production" value={car.production} />
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-black tracking-tight text-white">
              MORE FROM {car.brand.toUpperCase()}
            </h2>
            <Link
              to={`/brands/${brand?.slug ?? ""}`}
              className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-apex-red"
            >
              Heritage →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((c) => (
              <CarCard key={c.slug} car={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
