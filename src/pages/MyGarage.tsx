import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CarCard } from "@/components/CarCard";
import { mergedCarBySlug } from "@/data/cars";
import type { Car } from "@/lib/types";
import { useApp } from "@/context/app-context";
import { formatPriceFull, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  ArrowRight,
  Car as CarIcon,
  Wallet,
  Zap,
  Gauge,
} from "lucide-react";

export default function MyGarage() {
  const { currency } = useApp();
  const garage = useQuery(api.garage.getMyGarage);
  const createGarage = useMutation(api.garage.createGarage);
  const renameGarage = useMutation(api.garage.renameGarage);
  const removeCar = useMutation(api.garage.removeCarFromGarage);

  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const cars = useMemo<Car[]>(
    () =>
      (garage?.carSlugs ?? [])
        .map((slug) => mergedCarBySlug(slug))
        .filter((c): c is Car => Boolean(c)),
    [garage],
  );

  const stats = useMemo(() => {
    const totalValue = cars.reduce((sum, c) => sum + c.priceUSD, 0);
    const totalPower = cars.reduce((sum, c) => sum + c.horsepower, 0);
    const topSpeed = cars.reduce((max, c) => Math.max(max, c.topSpeedKmh), 0);
    return { totalValue, totalPower, topSpeed };
  }, [cars]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      await createGarage({ name: createName.trim() || "My Garage" });
      setCreateName("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create your garage.");
    } finally {
      setCreating(false);
    }
  };

  const startRename = () => {
    setDraftName(garage?.name ?? "");
    setNameError("");
    setEditing(true);
  };

  const handleRename = async () => {
    if (savingName) return;
    setSavingName(true);
    setNameError("");
    try {
      await renameGarage({ name: draftName });
      setEditing(false);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Could not rename your garage.");
    } finally {
      setSavingName(false);
    }
  };

  const handleRemove = async (slug: string) => {
    if (removing) return;
    setRemoving(slug);
    try {
      await removeCar({ slug });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            <span className="inline-block size-1.5 rounded-full bg-apex-red" /> Owner&apos;s collection
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            MY GARAGE
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-apex-muted">
            Build your dream collection, give it a name, and show it off. Your
            garage lives on your account — not in your browser.
          </p>
        </div>
        {garage && (
          <Link
            to="/garage"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-apex-red hover:text-white"
          >
            <Plus className="size-4" /> Add machines
          </Link>
        )}
      </div>

      {garage === undefined ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="size-4 animate-spin" /> Loading your garage…
        </div>
      ) : garage === null ? (
        /* No garage yet — name it */
        <section className="mx-auto max-w-xl rounded-lg border border-apex-line bg-apex-panel p-8 sm:p-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-apex-red/15 text-apex-red">
            <CarIcon className="size-6" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-black tracking-tight text-white">
            NAME YOUR GARAGE
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Every collection starts with a name. Pick one — then fill it with
            machines from the archive.
          </p>
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            maxLength={60}
            placeholder="e.g. The Midnight Fleet"
            className="mt-5 w-full rounded-md border border-white/10 bg-[#0b0b0c] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
          />
          {createError && (
            <p className="mt-2 text-xs text-apex-red">{createError}</p>
          )}
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-apex-red px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Building…
              </>
            ) : (
              <>
                <Plus className="size-4" /> Build my garage
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-white/30">
            Tip: adding a car from any detail page creates your garage
            automatically.
          </p>
        </section>
      ) : (
        <>
          {/* Garage panel: name + stats */}
          <section className="rounded-lg border border-apex-line bg-apex-panel p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {editing ? (
                <div className="flex w-full max-w-md items-center gap-2">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleRename()}
                    maxLength={60}
                    autoFocus
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b0b0c] px-3.5 py-2.5 font-display text-xl font-black tracking-tight text-white outline-none transition-colors focus:border-apex-red"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRename()}
                    disabled={savingName}
                    aria-label="Save name"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-apex-red text-white transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    {savingName ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    aria-label="Cancel rename"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/60 transition-colors hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {garage.name}
                  </h2>
                  <button
                    type="button"
                    onClick={startRename}
                    aria-label="Rename garage"
                    className="flex size-8 items-center justify-center rounded-md border border-white/15 text-white/50 transition-colors hover:border-apex-red hover:text-apex-red"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              )}
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {cars.length} machine{cars.length === 1 ? "" : "s"}
              </span>
            </div>
            {nameError && <p className="mt-2 text-xs text-apex-red">{nameError}</p>}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-apex-line bg-[#0b0b0c] p-4">
                <Wallet className="size-4 text-apex-red" />
                <p className="mt-2 font-display text-xl font-black tracking-tight text-white">
                  {formatPriceFull(stats.totalValue, currency)}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Estimated value
                </p>
              </div>
              <div className="rounded-md border border-apex-line bg-[#0b0b0c] p-4">
                <Zap className="size-4 text-apex-red" />
                <p className="mt-2 font-display text-xl font-black tracking-tight text-white">
                  {formatNumber(stats.totalPower)} hp
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Combined power
                </p>
              </div>
              <div className="rounded-md border border-apex-line bg-[#0b0b0c] p-4">
                <Gauge className="size-4 text-apex-red" />
                <p className="mt-2 font-display text-xl font-black tracking-tight text-white">
                  {formatNumber(stats.topSpeed)} km/h
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Garage record
                </p>
              </div>
            </div>
          </section>

          {/* Cars */}
          {cars.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-apex-line px-6 py-16 text-center">
              <CarIcon className="size-8 text-white/25" />
              <h3 className="mt-4 font-display text-lg font-black tracking-tight text-white">
                THE BAYS ARE EMPTY
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
                {garage.name} has no machines yet. Walk the archive and add
                anything that makes your heart race.
              </p>
              <Link
                to="/garage"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-apex-red px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:brightness-110"
              >
                Browse the archive <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cars.map((car) => (
                <div key={car.slug} className="relative">
                  <CarCard car={car} />
                  <button
                    type="button"
                    onClick={() => void handleRemove(car.slug)}
                    disabled={removing === car.slug}
                    aria-label={`Remove ${car.model} from garage`}
                    className={cn(
                      "absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 backdrop-blur transition-colors hover:border-apex-red hover:text-apex-red",
                      removing === car.slug && "opacity-50",
                    )}
                  >
                    {removing === car.slug ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
