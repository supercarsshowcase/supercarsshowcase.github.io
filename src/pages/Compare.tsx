import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Scale, Plus, X, ArrowRight } from "lucide-react";
import { CARS, carBySlug } from "@/data/cars";
import { getCarImage, carWikiTitle } from "@/data/images";
import { useApp } from "@/context/app-context";
import { formatPriceCompact, formatNumber } from "@/lib/format";
import { SmartImage } from "@/components/SmartImage";

const MAX_CARS = 3;

type Row = {
  label: string;
  value: (car: (typeof CARS)[number]) => string;
};

const ROWS: Row[] = [
  { label: "Category", value: (c) => c.category },
  { label: "Year", value: (c) => String(c.year) },
  { label: "Engine", value: (c) => c.engine },
  { label: "Power", value: (c) => `${formatNumber(c.horsepower)} hp` },
  { label: "Torque", value: (c) => `${formatNumber(c.torqueNm)} Nm` },
  { label: "0–100 km/h", value: (c) => `${c.zeroToHundredKmh}s` },
  { label: "Top speed", value: (c) => `${formatNumber(c.topSpeedKmh)} km/h` },
  { label: "Weight", value: (c) => `${formatNumber(c.weightKg)} kg` },
  { label: "Drivetrain", value: (c) => c.driveType },
  { label: "Transmission", value: (c) => c.transmission },
  { label: "Body style", value: (c) => c.bodyStyle },
  { label: "Production", value: (c) => c.production },
];

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currency } = useApp();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    const fromUrl = (searchParams.get("cars") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_CARS);
    setSlugs(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cars = slugs
    .map((slug) => carBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const update = (next: string[]) => {
    setSlugs(next);
    setSearchParams(next.length ? { cars: next.join(",") } : {});
  };

  const addCar = (slug: string) => {
    if (!slug || slugs.includes(slug) || slugs.length >= MAX_CARS) return;
    update([...slugs, slug]);
  };

  const removeCar = (slug: string) => {
    update(slugs.filter((s) => s !== slug));
  };

  const remaining = CARS.filter((c) => !slugs.includes(c.slug));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          Spec battle
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          COMPARE MACHINES
        </h1>
        <p className="mt-3 max-w-lg text-sm text-apex-muted">
          Pit up to three supercars against each other in a head-to-head spec
          battle.
        </p>
      </div>

      {/* Selector */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {cars.map((car) => (
          <span
            key={car.slug}
            className="inline-flex items-center gap-2 rounded-md border border-apex-red/40 bg-apex-red/10 px-3 py-2 text-sm font-semibold text-white"
          >
            {car.brand} {car.model}
            <button
              type="button"
              onClick={() => removeCar(car.slug)}
              className="text-white/50 transition-colors hover:text-apex-red"
              aria-label={`Remove ${car.model}`}
            >
              <X className="size-4" />
            </button>
          </span>
        ))}

        {cars.length < MAX_CARS && (
          <select
            value=""
            onChange={(e) => addCar(e.target.value)}
            aria-label="Add a car to compare"
            className="h-10 cursor-pointer appearance-none rounded-md border border-apex-line bg-apex-panel px-4 pr-9 text-sm text-white outline-none focus:border-apex-red"
          >
            <option value="" disabled>
              Add a machine…
            </option>
            {remaining.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.brand} {c.model} ({c.year})
              </option>
            ))}
          </select>
        )}
      </div>

      {cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-apex-line bg-apex-panel/40 px-6 py-24 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-apex-red/10">
            <Scale className="size-7 text-apex-red" />
          </span>
          <h2 className="mt-6 font-display text-2xl font-black text-white">
            PICK YOUR CONTENDERS
          </h2>
          <p className="mt-2 max-w-sm text-sm text-apex-muted">
            Choose up to three machines from the selector above, or open any car
            page and hit “Compare”.
          </p>
          <Link
            to="/garage"
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-apex-red px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright"
          >
            Browse the garage
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-apex-line">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-apex-line bg-black/60">
                <th className="w-40 p-4 text-left font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Spec
                </th>
                {cars.map((car) => (
                  <th key={car.slug} className="min-w-[200px] p-4 text-left align-top">
                    <Link
                      to={`/cars/${car.slug}`}
                      className="group block overflow-hidden"
                    >
                      <div className="overflow-hidden rounded-md">
                        <SmartImage
                          src={getCarImage(car)}
                          alt={`${car.brand} ${car.model}`}
                          label={car.brand}
                          sublabel=""
                          seed={car.slug}
                          className="aspect-[16/9] w-full transition-transform group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        {car.brand}
                      </p>
                      <p className="font-display text-lg font-extrabold tracking-tight text-white">
                        {car.model}
                      </p>
                      <p className="mt-1 font-display text-lg font-black text-apex-red">
                        {formatPriceCompact(car.priceUSD, currency)}
                      </p>
                    </Link>
                  </th>
                ))}
                {cars.length < MAX_CARS && (
                  <th className="min-w-[160px] p-4 align-middle">
                    <Plus className="mx-auto size-6 text-white/20" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-apex-line last:border-0 odd:bg-apex-panel/50"
                >
                  <td className="p-4 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {row.label}
                  </td>
                  {cars.map((car) => (
                    <td key={car.slug} className="p-4 font-medium text-white">
                      {row.value(car)}
                    </td>
                  ))}
                  {cars.length < MAX_CARS && <td className="p-4 text-white/20">—</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
