import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, ChevronUp, Newspaper } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { carsList } from "@/data/cars";
import { BRANDS } from "@/data/brands";
import { getBrandImage } from "@/data/images";
import { CarCard } from "@/components/CarCard";
import { HOME_COPY, SITE_UPDATES_COPY } from "@/data/page-copy";

const STATS = [
  { value: "200+", label: "Machines" },
  { value: "18", label: "Marques" },
  { value: "531 KM/H", label: "Top Speed" },
  { value: "2,107", label: "Peak HP" },
];

function HeroBackground() {
  const [errored, setErrored] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden bg-apex-ink">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 70% 20%, #1a0b06 0%, transparent 55%), radial-gradient(90% 90% at 20% 90%, #0a0d12 0%, transparent 60%), #050505",
        }}
      />
      {!errored && (
        <img
          src={getBrandImage("Bugatti")}
          alt=""
          aria-hidden
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/30 to-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
    </div>
  );
}

export default function Landing() {
  const home = useQuery(api.pages.getPageContent, { page: "home" });
  const siteUpdates = useQuery(api.pages.getPageContent, { page: "siteUpdates" });
  const copy = { ...HOME_COPY, ...(home ?? {}) };
  const FEATURED_SLUGS = (copy.featuredSlugs || HOME_COPY.featuredSlugs)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const featured = FEATURED_SLUGS.map((slug) =>
    carsList().find((c) => c.slug === slug),
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="bg-apex-ink text-white">
      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh_-_4rem)] items-center overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red sm:text-xs">
              <span className="inline-block size-2 rounded-full bg-apex-red" />
              {copy.heroKicker}
            </p>
            <h1 className="mt-6 font-display text-6xl font-black leading-[0.9] tracking-tight sm:text-8xl">
              {copy.heroLine1}
              <br />
              <span className="text-white/35">{copy.heroSubA}</span>{" "}
              <span className="text-white">{copy.heroSubB}</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-white/70 sm:text-lg">
              {copy.heroBody}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/garage"
                className="group inline-flex items-center gap-2 rounded-md bg-apex-red px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-apex-red-bright hover:shadow-[0_0_40px_-8px_rgba(255,46,0,0.7)]"
              >
                {copy.cta1Lbl}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/brands/bugatti"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-white hover:bg-white/5"
              >
                {copy.cta2Lbl}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-apex-line bg-black">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-apex-line lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center gap-1 px-4 py-8 text-center"
            >
              <span className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl">
                {stat.value}
              </span>
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45 sm:text-xs">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center border-t border-apex-line py-2">
          <ChevronUp className="size-4 text-white/30" />
        </div>
      </section>

      {/* SITE UPDATES */}
      {(() => {
        const upd = { ...SITE_UPDATES_COPY, ...(siteUpdates ?? {}) };
        const hasContent = (upd.updatesBody || "").trim();
        if (!hasContent) return null;
        return (
          <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-apex-line bg-gradient-to-br from-apex-panel to-black p-8 sm:p-10"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-apex-red/15">
                  <Newspaper className="size-5 text-apex-red" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
                    {upd.updatesEyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {upd.updatesTitle}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                    {upd.updatesBody}
                  </p>
                </div>
              </div>
            </motion.div>
          </section>
        );
      })()}

      {/* FEATURED */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              {copy.featuredEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              {copy.featuredTitle}
            </h2>
          </div>
          <Link
            to="/garage"
            className="hidden items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-apex-red sm:flex"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((car) => (
            <CarCard key={car.slug} car={car} />
          ))}
        </div>
      </section>

      {/* MARQUES */}
      <section className="border-t border-apex-line bg-black/40">
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
          <div className="mb-10">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              {copy.marquesEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              {copy.marquesTitle}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {BRANDS.map((brand) => (
              <Link
                key={brand.slug}
                to={`/brands/${brand.slug}`}
                className="group relative overflow-hidden rounded-lg border border-apex-line bg-apex-panel p-5 transition-all hover:-translate-y-1 hover:border-apex-line-strong"
              >
                <span
                  className="absolute right-3 top-3 size-2 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ background: brand.accent }}
                />
                <span className="font-display text-lg font-extrabold tracking-tight text-white transition-colors group-hover:text-apex-red">
                  {brand.name}
                </span>
                <span className="mt-1 block text-xs text-apex-muted">
                  {brand.founded}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-apex-line">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a0a04] via-apex-ink to-apex-ink" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            {(() => {
              const w = (copy.ctaHeading || "").trim().split(/\s+/).filter(Boolean);
              const last = w.pop() ?? "";
              return w.length ? (
                <>
                  {w.join(" ")}{" "}
                  <span className="text-apex-red">{last}</span>
                </>
              ) : (
                <span className="text-white">{last}</span>
              );
            })()}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/60">
            {copy.ctaBody}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/garage"
              className="group inline-flex items-center gap-2 rounded-md bg-apex-red px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-apex-red-bright"
            >
              {copy.ctaBtn1}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/rankings"
              className="inline-flex items-center gap-2 rounded-md border border-white/25 px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-white"
            >
              {copy.ctaBtn2}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
