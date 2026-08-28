/**
 * GamePanels — All game tab panels for the Garage Tycoon game.
 * Reconstructed from production build output.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion as Ge, AnimatePresence as ts } from "framer-motion";
import { toast as ye } from "sonner";
import {
  rollSpin, spinReadyAt, spinCashSlices, hourlySupercar, hourlySupercar01,
  hourlySupercar001, nextSupercarSwapAt, rollCrate, saveGame, initialGameState,
  passivePerSec, clickValue, dailyReward, carValue, carPower,
  buyPrice as calcBuyPrice, rollDealerStock, upgradeCost as calcUpgradeCost,
  crateCost as calcCrateCost, spinSupercarPool, gameReducer, critChance,
} from "../../game/engine";
import {
  GAME_CAR_MAP, gameCarImage, RARITY_META, ACHIEVEMENTS,
  DEALERS, CRATES, UPGRADES, PARTS, fmtMoney, fmtNum,
  levelFrom,
} from "../../game/data";
import { SmartImage } from "../SmartImage";
import { cn } from "../../lib/utils";
import { CasinoPanel } from "./CasinoPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";
import type { GameState, Rarity, SpinResult, CrateResult } from "../../game/types";
import {
  RefreshCw, Trophy, Wrench, Package, X as XIcon, Save,
  Gem, Clock, Shield, TrendingUp, Award, Star, Sparkles,
  Timer, DollarSign, Car, Flame, Bomb, CircleDot, Target,
  Swords, Zap, Crown, Circle, BarChart3, Home,
} from "lucide-react";

const Te = GAME_CAR_MAP;
const es = gameCarImage;
const Ha = SmartImage;
const ce = cn;
const dp = RARITY_META;
const Gh = ACHIEVEMENTS;
const Tc = DEALERS;
const v1 = CRATES;
const D1 = calcBuyPrice;
const pp = rollDealerStock;
const c9 = rollCrate;
const Wy = RefreshCw;

function Ie(v: number): string {
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
  if (v >= 1e4) return "$" + Math.round(v / 1e3) + "K";
  return "$" + Math.round(v).toLocaleString();
}
function Qi(v: number): string { return Math.round(v).toLocaleString(); }
const Ur = carValue;
const T1 = carPower;
const q1 = 12;
const or2 = 360 / q1;
const U9 = ["#b45309","#1f1f24","#2d2d33","#1f1f24","#7c3aed","#1f1f24","#2d2d33","#1f1f24","#d4af37","#1f1f24","#2d2d33","#1f1f24"];
const Oy: Record<number, any> = {
  0: { tier: 1, pct: "1%", borderClass: "border-amber-300/70", labelBg: "bg-amber-400 text-amber-900" },
  4: { tier: 2, pct: "0.01%", borderClass: "border-purple-400/70", labelBg: "bg-purple-400 text-purple-900" },
  8: { tier: 3, pct: "0.001%", borderClass: "border-yellow-300/70", labelBg: "bg-yellow-300 text-yellow-900" },
};
const B9: Record<string, any> = { crate: Package, crate2: Gem, crate3: Sparkles, crate4: Crown, crate5: Star, default: Package };
const SLICE_CASH = [1, 2, 3, 5, 6, 7, 9, 10, 11];

function SectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">{eyebrow}</p>
      <h3 className="mt-1 font-display text-2xl font-black tracking-tight text-white">{title}</h3>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const m = dp[rarity];
  if (!m) return null;
  return (
    <span className="rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
      style={{ borderColor: m.color, color: m.color, background: m.color + "14" }}>
      {m.label}
    </span>
  );
}

/* ─── SpinPanel ─── */
function SpinPanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const now = Date.now();
  const readyAt = spinReadyAt(state);
  const canSpin = now >= readyAt && !spinning;
  const cashSlices = useMemo(() => spinCashSlices(state), [state]);
  const previewCar = hourlySupercar(now);
  const previewCar01 = hourlySupercar01(now);
  const previewCar001 = hourlySupercar001(now);
  const swapsAt = nextSupercarSwapAt(now);
  const [swapCountdown, setSwapCountdown] = useState(Math.max(0, swapsAt - now));

  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setSwapCountdown(Math.max(0, nextSupercarSwapAt(n) - n));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const swapLabel = useMemo(() => {
    const s = Math.ceil(swapCountdown / 1000);
    const h2 = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const parts: string[] = [];
    if (h2 > 0) parts.push(h2 + "h");
    if (m > 0 || h2 > 0) parts.push(m + "m");
    parts.push(sec + "s");
    return parts.join(" ");
  }, [swapCountdown]);

  const spin = useCallback(() => {
    if (!canSpin || spinning) return;
    const res = rollSpin(state, Date.now());
    setResult(res);
    setSpinning(true);
    const targetMod = (360 - (res.slice * or2 + or2 / 2)) % 360;
    setRotation((prev) => {
      const currentMod = (prev % 360 + 360) % 360;
      return prev + (targetMod - currentMod + 360) % 360 + 360 * 5;
    });
  }, [canSpin, spinning, state]);

  const skipSpin = useCallback(() => {
    if (!result || !spinning) return;
    dispatch({ type: 'SPIN', now: Date.now(), result });
    setSpinning(false);
  }, [result, spinning]);

  const wonCar = result?.kind === 'car' && result.carId ? Te[result.carId] : null;
  const stops = U9.map((c, i) => c + " " + (i * or2).toFixed(1) + "deg " + ((i + 1) * or2).toFixed(1) + "deg").join(", ");
  const waitSec = Math.max(0, Math.ceil((readyAt - now) / 1000));
  const waitLabel = waitSec >= 3600 ? Math.floor(waitSec / 3600) + "h " + Math.floor((waitSec % 3600) / 60) + "m" : waitSec >= 60 ? Math.floor(waitSec / 60) + "m " + (waitSec % 60) + "s" : waitSec + "s";

  return (
    <div>
      <SectionHeader eyebrow="Lucky Spin" title="SPIN THE WHEEL" hint="Free every 15 minutes. Admin can grant bonus spins. Three car tiers rotate hourly." />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-[600px]">
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
            <svg width="34" height="30" viewBox="0 0 34 30" className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]">
              <path d="M17 30 L4 6 A17 17 0 0 1 30 6 Z" fill="#ff2e00" />
              <circle cx="17" cy="8" r="3" fill="#0b0b0c" />
            </svg>
          </div>
          <Ge.div className="absolute inset-0 rounded-full border-[3px] border-[#3a3a40]"
            style={{ background: "conic-gradient(" + stops + ")" }}
            animate={{ rotate: rotation }}
            transition={{ duration: 4.5, ease: [0.12, 0.75, 0.2, 1] }}
            onAnimationComplete={() => { if (result) { dispatch({ type: "SPIN", now: Date.now(), result }); setSpinning(false); } }}>
            {[{ car: previewCar, si: 0 }, { car: previewCar01, si: 4 }, { car: previewCar001, si: 8 }].map(({ car, si }) => {
              if (!car) return null;
              const meta = Oy[si];
              const angle = ((si * or2 + or2 / 2) * Math.PI) / 180;
              return (
                <div key={meta.tier} className={"absolute overflow-hidden rounded-md border-2 " + meta.borderClass}
                  style={{ left: (50 + 30 * Math.sin(angle)) + "%", top: (50 - 30 * Math.cos(angle)) + "%", width: "17%", aspectRatio: "16/10", transform: "translate(-50%, -50%)", boxShadow: "0 4px 18px rgba(0,0,0,0.55)", zIndex: 10 }}>
                  <Ha src={es(car)} alt={car.name} seed={car.id} className="h-full w-full object-cover" />
                  <span className={"absolute left-1 top-1 rounded px-1 py-0.5 text-[7px] font-black uppercase " + meta.labelBg}>{meta.pct}</span>
                </div>
              );
            })}
            {Array.from({ length: q1 }, (_, i) => {
              const angle = ((i * or2 + or2 / 2) * Math.PI) / 180;
              const isCar = Oy[i];
              const r = isCar ? 30 : 37;
              const x = 50 + r * Math.sin(angle);
              const y = 50 - r * Math.cos(angle);
              let label = "";
              if (isCar) { label = isCar.pct; }
              else { const ci = SLICE_CASH.indexOf(i); const val = cashSlices[ci] ?? 0; label = val >= 1000 ? "$" + (val / 1000).toFixed(1) + "K" : "$" + val; }
              if (isCar) {
                return <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 font-display text-[11px] font-black uppercase tracking-tight text-white"
                  style={{ left: x + "%", top: y + "%", zIndex: 30, textShadow: "0 1px 4px rgba(0,0,0,0.9)", backdropFilter: "blur(4px)" }}>{"★ " + label}</span>;
              }
              return <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 font-display text-[10px] font-black uppercase tracking-tight text-white/85"
                style={{ left: x + "%", top: y + "%", textShadow: "0 1px 4px rgba(0,0,0,0.9)", zIndex: 20 }}>{label}</span>;
            })}
            <div className="absolute left-1/2 top-1/2 z-10 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#3a3a40] bg-[#0b0b0c]">
              <span className="font-display text-[9px] font-black uppercase tracking-[0.1em] text-apex-red">Spin</span>
            </div>
          </Ge.div>
        </div>
        <div className="flex flex-col justify-center">
          <button type="button" disabled={!canSpin} onClick={spin}
            className="rounded-md bg-apex-red py-3 font-display text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
            {spinning ? "Spinning…" : canSpin ? (state.freeSpins > 0 ? `SPIN — ${state.freeSpins.toLocaleString()} FREE SPINS` : "SPIN — FREE") : "Next spin in " + waitLabel}
          </button>
          {spinning && (
            <button type="button" onClick={skipSpin}
              className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/5 py-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/70 transition-colors hover:border-amber-400/50 hover:text-amber-300">
              Skip Animation
            </button>
          )}

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">1% ($10-30M) | 0.01% ($100-300M) | 0.001% ($1B+) | bonus spins available</p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">This hour{"'"}s cars</p>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/30 bg-amber-300/5 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300">
                <Wy className="size-2.5" />{swapLabel}
              </span>
            </div>
            {[{ car: previewCar, tier: 1, pct: "1%", color: "#f59e0b", range: "$10M \u2013 $30M" },
              { car: previewCar01, tier: 2, pct: "0.01%", color: "#c084fc", range: "$100M \u2013 $300M" },
              { car: previewCar001, tier: 3, pct: "0.001%", color: "#ffd700", range: "$1B+" }].map(({ car, tier, pct, color, range }) =>
              car ? (
                <div key={tier} className="overflow-hidden rounded-xl border bg-apex-panel" style={{ borderColor: color + "40" }}>
                  <div className="flex gap-3 p-3">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[#0a0a0b]">
                      <Ha src={es(car)} alt={car.name} seed={car.id} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-sm px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-wider"
                          style={{ background: color + "20", color, border: "1px solid " + color + "40" }}>{pct}</span>
                        <span className="text-[10px] text-white/30">{range}</span>
                      </div>
                      <p className="mt-1 truncate font-display text-sm font-black text-white">{car.name}</p>
                      <p className="truncate text-[10px] text-white/35">{car.brand} {"· " + Ie(car.value)}</p>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
          <div className="mt-6 min-h-[7.5rem] rounded-xl border border-apex-line bg-apex-panel p-5 text-center">
            <ts mode="wait">
              {spinning ? (
                <Ge.p key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">Spinning{"… the wheel decides your fate"}</Ge.p>
              ) : result ? (
                wonCar ? (
                  <Ge.div key={"won-" + (result.kind === "car" ? result.carId : "cash")} initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300">
                      {(result.kind === "car" && result.tier === 3 ? "ULTRA RARE" : result.kind === "car" && result.tier === 2 ? "MYTHIC" : "SUPERCAR")} WON!
                    </p>
                    <p className="mt-2 font-display text-2xl font-black text-white">{wonCar.name}</p>
                    <p className="mt-1 text-xs text-white/40">{wonCar.brand} {"· " + Ie(wonCar.value) + " · " + Qi(wonCar.hp) + " hp"}</p>
                    <p className="mt-1 text-[10px] font-bold text-green-400">Added to your garage!</p>
                  </Ge.div>
                ) : (
                  <Ge.div key="won-cash" initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">You won</p>
                    <p className="mt-2 font-display text-4xl font-black text-apex-red">{"+" + Ie(result.kind === "cash" ? (result.amount ?? 0) : 0)}</p>
                  </Ge.div>
                )
              ) : (
                <Ge.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">Good luck — the wheel is rigged in your favour… barely.</Ge.p>
              )}
            </ts>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── GaragePanel ─── */
function GaragePanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const owned = Object.keys(state.ownedCars);
  const cars = owned.map(id => Te[id]).filter(Boolean).sort((a: any, b: any) => Ur(state, b.id) - Ur(state, a.id));
  return (
    <div>
      <SectionHeader eyebrow="Collection" title="YOUR GARAGE" hint={owned.length + " machine" + (owned.length === 1 ? "" : "s") + " · total value " + Ie(cars.reduce((s: number, c: any) => s + Ur(state, c.id), 0))} />
      {cars.length === 0 ? <p className="text-sm text-white/40">No cars yet. Visit the dealers.</p> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car: any) => {
            const active = car.id === state.activeCarId;
            const ups = Object.values(state.ownedCars[car.id]?.upgrades ?? {}).reduce((s: number, v: any) => s + v, 0);
            return (
              <div key={car.id} className={ce("group relative overflow-hidden rounded-xl border bg-apex-panel transition-colors", active ? "border-apex-red/60" : "border-apex-line hover:border-white/25")}>
                <div className="relative h-36 overflow-hidden bg-[#0a0a0b]">
                  <Ha src={es(car)} alt={car.name} seed={car.id} className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute left-2 top-2"><RarityBadge rarity={car.rarity} /></div>
                  {active && <span className="absolute right-2 top-2 rounded-sm bg-apex-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">Active</span>}
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{car.brand} {"· " + car.year}</p>
                  <h4 className="mt-0.5 font-display text-lg font-black tracking-tight text-white">{car.name}</h4>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-white/40"><span className="font-display font-black text-apex-red">{Ie(Ur(state, car.id))}</span> {" "}value</span>
                    <span className="text-white/40"><span className="font-display font-black text-white">{Qi(T1(state, car.id))}</span> {" "}hp</span>
                    <span className="text-white/40">{ups} upgrades</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!active && <button type="button" onClick={() => dispatch({ type: "SET_ACTIVE", id: car.id })}
                      className="flex-1 rounded-md border border-apex-red/40 bg-apex-red/10 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red">Drive</button>}
                    <button type="button" disabled={owned.length <= 1}
                      onClick={() => { if (window.confirm("Sell the " + car.name + " for " + Ie(Math.round(Ur(state, car.id) * 0.35)) + "?")) dispatch({ type: "SELL_CAR", id: car.id }); }}
                      className="flex-1 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-apex-red hover:text-apex-red disabled:cursor-not-allowed disabled:opacity-30">Sell</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── DealerPanel ─── */
function DealerPanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const level = levelFrom(state);
  return (
    <div>
      <SectionHeader eyebrow="Dealerships" title="BUY MACHINES" hint="Stock rotates when you refresh. Level up to unlock bigger showrooms." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Tc.map((dealer: any) => {
          const locked = level < dealer.unlockLevel;
          const stock = state.dealerStock[dealer.id] ?? [];
          return (
            <div key={dealer.id} className={ce("rounded-xl border bg-apex-panel p-4", locked ? "border-white/10 opacity-60" : "border-apex-line")}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-display text-lg font-black tracking-tight text-white">{dealer.name}</h4>
                  <p className="text-[11px] text-white/40">{dealer.tagline}</p>
                </div>
                {locked ? <span className="rounded-sm border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Level {dealer.unlockLevel}</span> : (
                  <button type="button" disabled={state.cash < dealer.refreshCost}
                    onClick={() => dispatch({ type: "REFRESH_DEALER", dealerId: dealer.id, stock: pp(dealer), refreshAt: Date.now(), cost: dealer.refreshCost })}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white disabled:opacity-30">
                    <Wy className="size-3" />{Ie(dealer.refreshCost)}
                  </button>
                )}
              </div>
              {locked ? <p className="text-xs text-white/30">Reach level {dealer.unlockLevel} to walk this floor.</p> : (
                <div className="grid grid-cols-2 gap-3">
                  {stock.map((carId: string) => {
                    const car = Te[carId];
                    if (!car) return null;
                    const owned = !!state.ownedCars[carId];
                    const unlocked = level >= car.unlockLevel;
                    const price = D1(carId);
                    return (
                      <div key={carId} className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0d]">
                        <div className="relative h-20 bg-[#0a0a0b]">
                          <Ha src={es(car)} alt={car.name} seed={carId} className="h-full w-full object-cover" />
                          <div className="absolute left-1.5 top-1.5"><RarityBadge rarity={car.rarity} /></div>
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">{car.brand} {"· " + car.year}</p>
                          <p className="truncate font-display text-sm font-black text-white">{car.name}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-display text-xs font-black text-apex-red">{Ie(price)}</span>
                            <button type="button" disabled={owned || !unlocked || state.cash < price}
                              onClick={() => dispatch({ type: "BUY_CAR", id: carId })}
                              className="rounded-md bg-apex-red px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
                              {owned ? "Owned" : unlocked ? "Buy" : "Lv " + car.unlockLevel}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── CratePanel ─── */
function CratePanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const [lastResult, setLastResult] = useState<CrateResult | null>(null);
  const openCrate = (crateId: string) => {
    const result = c9(state, crateId);
    dispatch({ type: "OPEN_CRATE", crateId, result });
    setLastResult(result);
  };
  return (
    <div>
      <SectionHeader eyebrow="Loot" title="CAR CRATES" hint={state.cratesOpened + " crates opened. Cars, parts or cash inside."} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {v1.map((crate: any) => {
          const Icon = B9[crate.icon] ?? Package;
          return (
            <div key={crate.id} className="group flex flex-col rounded-xl border border-apex-line bg-apex-panel p-5 transition-colors hover:border-white/25">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg border" style={{ borderColor: crate.color, color: crate.color, background: crate.color + "14" }}>
                <Icon className="size-5" />
              </div>
              <h4 className="font-display text-base font-black text-white">{crate.name}</h4>
              <p className="mt-1 text-[11px] text-white/40">{crate.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-display text-sm font-black text-apex-red">{Ie(calcCrateCost(crate.id))}</span>
                <button type="button" disabled={state.cash < calcCrateCost(crate.id)} onClick={() => openCrate(crate.id)}
                  className="rounded-md bg-apex-red px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">Open</button>
              </div>
            </div>
          );
        })}
      </div>
      {lastResult && (
        <div className="mt-6 rounded-xl border border-apex-line bg-apex-panel p-5 text-center">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">Last Drop</p>
          <p className="mt-2 font-display text-xl font-black text-white">
            {lastResult.kind === "car" ? (Te[lastResult.carId]?.name ?? "Car") : lastResult.kind === "part" ? "Part" : Ie(lastResult.cash ?? 0)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── UpgradePanel ─── */
function UpgradePanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const car = Te[state.activeCarId];
  if (!car) return <div><SectionHeader eyebrow="Upgrades" title="UPGRADES" hint="Select a car first." /></div>;
  const ownedCar = state.ownedCars[state.activeCarId];
  const cats: Record<string, string> = { restore: "Restoration", performance: "Performance", handling: "Handling", cosmetic: "Cosmetic" };
  const upgrades = UPGRADES.filter((u: any) => !u.brands || u.brands.length === 0 || u.brands.includes(car.brand));
  return (
    <div>
      <SectionHeader eyebrow="Modifications" title="UPGRADES" hint={car.brand + " " + car.name} />
      {Object.entries(cats).map(([cat, label]) => {
        const items = upgrades.filter((u: any) => u.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <p className="mb-3 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{label}</p>
            <div className="space-y-2">
              {items.map((upg: any) => {
                const stage = ownedCar?.upgrades?.[upg.id] ?? 0;
                const maxed = stage >= upg.stages.length;
                const cost = maxed ? 0 : calcUpgradeCost(state, state.activeCarId, upg.id);
                return (
                  <div key={upg.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-apex-panel px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/60"><Wrench className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-display text-sm font-bold text-white">{upg.name}</p>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{maxed ? "Maxed" : "Stage " + (stage + 1) + "/" + upg.stages.length}</span>
                      </div>
                      <p className="truncate text-[10px] text-white/35">{upg.desc}</p>
                      <div className="mt-2 flex items-center gap-1">{upg.stages.map((_: any, idx: number) => <span key={idx} className={ce("h-1 flex-1 rounded-full", idx < stage ? "bg-apex-red" : "bg-white/10")} />)}</div>
                    </div>
                    <button type="button" disabled={maxed || state.cash < cost}
                      onClick={() => dispatch({ type: "BUY_UPGRADE", upgradeId: upg.id })}
                      className="shrink-0 rounded-md bg-apex-red px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
                      {maxed ? "Maxed" : Ie(cost)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── PartsBin ─── */
function PartsBin({ state, dispatch }: { state: GameState; dispatch: any }) {
  const held = PARTS.filter((p: any) => (state.inventory[p.id] ?? 0) > 0);
  return (
    <div>
      <SectionHeader eyebrow="Parts Bin" title="INVENTORY" hint="Held parts add global bonuses. Sell duplicates for cash." />
      {held.length === 0 ? <p className="text-sm text-white/40">Empty. Open crates to collect parts.</p> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {held.map((part: any) => {
            const count = state.inventory[part.id] ?? 0;
            const bonuses = [part.clickMult ? "+" + Math.round(part.clickMult * 100) + "% click" : "", part.passiveMult ? "+" + Math.round(part.passiveMult * 100) + "% income" : ""].filter(Boolean).join(" · ");
            return (
              <div key={part.id} className="rounded-xl border border-apex-line bg-apex-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><RarityBadge rarity={part.rarity} /><h4 className="mt-2 font-display text-base font-black text-white">{part.name}</h4></div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{"×" + count}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/40">{part.desc}</p>
                <p className="mt-1 text-[11px] font-semibold text-apex-red">{bonuses || "Cosmetic"}</p>
                <button type="button" onClick={() => dispatch({ type: "SELL_PART", partId: part.id })}
                  className="mt-3 w-full rounded-md border border-white/15 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-apex-red">
                  {"Sell for " + Ie(part.value)}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── AchievementsPanel ─── */
function AchievementsPanel({ state }: { state: GameState }) {
  return (
    <div>
      <SectionHeader eyebrow="Achievements" title="ACHIEVEMENTS" hint={state.achievements.length + "/" + Gh.length + " unlocked."} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Gh.map((ach: any) => {
          const unlocked = state.achievements.includes(ach.id);
          return (
            <div key={ach.id} className={ce("flex items-center gap-3 rounded-lg border px-4 py-3", unlocked ? "border-apex-red/40 bg-apex-red/5" : "border-white/10 bg-apex-panel opacity-70")}>
              <span className={ce("flex size-8 shrink-0 items-center justify-center rounded-full border font-display text-xs font-black", unlocked ? "border-apex-red bg-apex-red text-white" : "border-white/15 text-white/30")}>{unlocked ? "✓" : "•"}</span>
              <div className="min-w-0">
                <p className={ce("truncate font-display text-sm font-bold", unlocked ? "text-white" : "text-white/60")}>{ach.name}</p>
                <p className="truncate text-[11px] text-white/40">{ach.desc}</p>
              </div>
              {(ach.rewardCash ?? 0) > 0 && <span className="ml-auto shrink-0 text-[11px] font-bold text-apex-red">{Ie(ach.rewardCash ?? 0)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PrestigePanel ─── */
function PrestigePanel({ state, dispatch }: { state: GameState; dispatch: any }) {
  const required = 5000 * (state.prestigeLevel + 1);
  const canPrestige = state.reputation >= required;
  return (
    <div>
      <SectionHeader eyebrow="Rebirth" title="PRESTIGE" hint="Reset cash, cars, parts for a permanent +5% income/click bonus per level." />
      <div className="max-w-lg rounded-xl border border-apex-line bg-apex-panel p-5">
        <div className="flex items-center gap-3">
          <Award className="size-5 text-apex-red" />
          <div>
            <p className="font-display text-lg font-black text-white">Reputation {Qi(state.reputation)} / {Qi(required)}</p>
            <p className="text-[11px] text-white/40">Prestige level {state.prestigeLevel} {"· next bonus +5% earnings"}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <Ge.div className="h-full rounded-full bg-apex-red" animate={{ width: Math.min(100, state.reputation / required * 100) + "%" }} />
        </div>
        <div className="mt-4 space-y-1 text-[11px] text-white/40">
          <p>Keeps: prestige level, achievements, lifetime earnings.</p>
          <p>Resets: cash, cars, parts, dealer stock, daily streak.</p>
        </div>
        <button type="button" disabled={!canPrestige}
          onClick={() => { if (window.confirm("Prestige now?")) { dispatch({ type: "PRESTIGE" }); ye.success("Prestige " + (state.prestigeLevel + 1) + " reached"); } }}
          className="mt-4 w-full rounded-md bg-apex-red py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
          {canPrestige ? "Prestige" : "Need " + Qi(required - state.reputation) + " more rep"}
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[{ icon: Shield, t: "+5% earnings" }, { icon: TrendingUp, t: "+5% clicks" }, { icon: Award, t: "Better luck" }].map(({ icon: Icon, t }, idx) => (
          <div key={idx} className="rounded-xl border border-apex-line bg-apex-panel p-4">
            <Icon className="size-5 text-apex-red" />
            <p className="mt-2 font-display text-sm font-bold text-white">{t}</p>
            <p className="text-[10px] text-white/40">per prestige level</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── GamePanels Router ─── */
export function GamePanels({ tab, state, dispatch }: { tab: string; state: GameState; dispatch: any }) {
  switch (tab) {
    case "spin": return <SpinPanel state={state} dispatch={dispatch} />;
    case "dealer": return <DealerPanel state={state} dispatch={dispatch} />;
    case "crates": return <CratePanel state={state} dispatch={dispatch} />;
    case "upgrades": return <UpgradePanel state={state} dispatch={dispatch} />;
    case "inventory": return <PartsBin state={state} dispatch={dispatch} />;
    case "achievements": return <AchievementsPanel state={state} />;
    case "prestige": return <PrestigePanel state={state} dispatch={dispatch} />;
    case "casino": return <CasinoPanel state={state} dispatch={dispatch} />;
    case "leaderboard": return <LeaderboardPanel />;
    default: return <GaragePanel state={state} dispatch={dispatch} />;
  }
}
