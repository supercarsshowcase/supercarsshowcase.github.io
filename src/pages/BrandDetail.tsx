import { Link, useParams } from "react-router";
import { ArrowLeft, MapPin, Flag, CalendarDays } from "lucide-react";
import { brandBySlug } from "@/data/brands";
import { carsList } from "@/data/cars";
import { getBrandImage } from "@/data/images";
import { SmartImage } from "@/components/SmartImage";
import { CarCard } from "@/components/CarCard";

export default function BrandDetail() {
  const { slug } = useParams<{ slug: string }>();
  const brand = slug ? brandBySlug(slug) : undefined;

  if (!brand) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center">
        <p className="font-display text-2xl font-black text-white">
          Marque not found
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

  const cars = carsList().filter((c) => c.brand === brand.name);

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-apex-line">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-apex-ink to-black" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(90% 90% at 85% 20%, ${brand.accent}55 0%, transparent 55%)`,
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
          <Link
            to="/garage"
            className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" /> All marques
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: brand.accent }}
                />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
                  Marque dossier
                </span>
              </div>
              <h1 className="mt-4 font-display text-6xl font-black tracking-tight text-white sm:text-7xl">
                {brand.name.toUpperCase()}
              </h1>
              <p className="mt-4 font-display text-lg font-semibold italic text-white/60">
                “{brand.tagline}”
              </p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/65">
                {brand.story}
              </p>

              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-apex-muted">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-apex-red" /> Founded {brand.founded}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-apex-red" /> {brand.hq}
                </span>
                <span className="flex items-center gap-2">
                  <Flag className="size-4 text-apex-red" /> {brand.country}
                </span>
              </div>
            </div>

            <div className="w-full max-w-md shrink-0 overflow-hidden rounded-lg border border-apex-line">
              <SmartImage
                src={getBrandImage(brand.name)}
                alt={brand.name}
                label={brand.name}
                sublabel={`Est. ${brand.founded}`}
                accent={brand.accent}
                seed={brand.name}
                className="aspect-[16/10] w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="mb-10">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Heritage
          </p>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-white">
            THE TIMELINE
          </h2>
        </div>

        <div className="relative ml-2 border-l border-apex-line-strong pl-8 sm:ml-6 sm:pl-12">
          {brand.milestones.map((m, i) => (
            <div key={`${m.year}-${m.title}`} className="relative pb-10 last:pb-0">
              <span
                className="absolute -left-[41px] top-1.5 flex size-4 items-center justify-center rounded-full border-2 sm:-left-[57px]"
                style={{ borderColor: brand.accent, background: "#050505" }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: brand.accent }}
                />
              </span>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                <span
                  className="w-20 shrink-0 font-display text-lg font-black tracking-tight"
                  style={{ color: brand.accent }}
                >
                  {m.year}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-white">
                    {m.title}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
                    {m.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cars */}
      <section className="border-t border-apex-line bg-black/40">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
                The collection
              </p>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-white">
                {cars.length} MACHINES ARCHIVED
              </h2>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cars.map((car) => (
              <CarCard key={car.slug} car={car} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
