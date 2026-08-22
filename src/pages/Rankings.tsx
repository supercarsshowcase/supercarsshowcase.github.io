import { useMemo } from "react";
import { Link } from "react-router";
import { Gauge, Zap, Banknote, ArrowRight } from "lucide-react";
import { carsList } from "@/data/cars";
import { getCarImage } from "@/data/images";
import { useApp } from "@/context/app-context";
import { formatNumber, formatPriceCompact } from "@/lib/format";
import { SmartImage } from "@/components/SmartImage";
import type { Car } from "@/lib/types";

function RankedRow({
  car,
  rank,
  metric,
  link,
}: {
  car: Car;
  rank: number;
  metric: string;
  link: string;
}) {
  const { currency } = useApp();
  return (
    <Link
      to={link}
      className="group flex items-center gap-4 rounded-lg border border-apex-line bg-apex-panel p-3 transition-all hover:-translate-y-0.5 hover:border-apex-line-strong sm:gap-5 sm:p-4"
    >
      <span
        className={`w-10 shrink-0 text-center font-display text-2xl font-black tracking-tight sm:text-3xl ${
          rank === 1 ? "text-apex-red" : "text-white/25"
        }`}
      >
        {rank}
      </span>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md sm:h-16 sm:w-24">
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
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          {car.brand} · {car.year}
        </p>
        <h3 className="truncate font-display text-base font-extrabold tracking-tight text-white sm:text-lg">
          {car.model}
        </h3>
        <p className="mt-0.5 text-xs text-apex-muted">
          {formatPriceCompact(car.priceUSD, currency)} · {formatNumber(car.horsepower)} hp
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-lg font-black tracking-tight text-apex-red sm:text-2xl">
          {metric}
        </p>
      </div>
      <ArrowRight className="hidden size-4 shrink-0 text-white/25 transition-colors group-hover:text-apex-red sm:block" />
    </Link>
  );
}

export default function Rankings() {
  const { currency } = useApp();
  const fastest = useMemo(
    () => carsList().sort((a, b) => b.topSpeedKmh - a.topSpeedKmh).slice(0, 10),
    [],
  );
  const powerful = useMemo(
    () => carsList().sort((a, b) => b.horsepower - a.horsepower).slice(0, 10),
    [],
  );
  const expensive = useMemo(
    () => carsList().sort((a, b) => b.priceUSD - a.priceUSD).slice(0, 10),
    [],
  );

  const sections = [
    {
      icon: Gauge,
      title: "Fastest",
      subtitle: "Top speed, ranked",
      cars: fastest,
      metric: (c: Car) => `${formatNumber(c.topSpeedKmh)} km/h`,
    },
    {
      icon: Zap,
      title: "Most Powerful",
      subtitle: "Peak horsepower, ranked",
      cars: powerful,
      metric: (c: Car) => `${formatNumber(c.horsepower)} hp`,
    },
    {
      icon: Banknote,
      title: "Most Expensive",
      subtitle: "Estimated value, ranked",
      cars: expensive,
      metric: (c: Car) => formatPriceCompact(c.priceUSD, currency),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          Leaderboards
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          THE RANKINGS
        </h1>
        <p className="mt-3 max-w-lg text-sm text-apex-muted">
          The fastest, the most powerful and the most valuable machines in the
          archive, side by side.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-apex-red/15">
                <section.icon className="size-4 text-apex-red" />
              </span>
              <div>
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-white">
                  {section.title}
                </h2>
                <p className="text-xs text-apex-muted">{section.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {section.cars.map((car, i) => (
                <RankedRow
                  key={car.slug}
                  car={car}
                  rank={i + 1}
                  metric={section.metric(car)}
                  link={`/cars/${car.slug}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
