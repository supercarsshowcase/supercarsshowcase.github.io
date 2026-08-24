/**
 * GamePanels — All game tab panels for the Garage Tycoon game.
 */
import React from "react";
import { motion as Ge, AnimatePresence as ts } from "framer-motion";
import { toast as ye } from "sonner";
import {
  rollSpin, spinReadyAt, spinCashSlices, hourlySupercar, hourlySupercar01,
  hourlySupercar001, nextSupercarSwapAt, rollCrate, saveGame,
  passivePerSec, clickValue, dailyReward, levelFrom, carValue, carPower,
  buyPrice as calcBuyPrice, rollDealerStock, upgradeCost as calcUpgradeCost,
  spinSupercarPool,
} from "../../game/engine";
import { GAME_CAR_MAP, gameCarImage } from "../../game/data";
import { SmartImage } from "../SmartImage";
import { cn } from "../../lib/utils";
import {
  RefreshCw, Trophy, Wrench, Package, X as XIcon, Save,
  Gem, Clock, Shield, TrendingUp, Award, Star,
} from "lucide-react";
import type { GameState } from "../../game/types";

// Aliases matching the minified code
const Te = GAME_CAR_MAP;
const es = gameCarImage;
const Ha = SmartImage;
const ce = cn;

// Utility formatting
function Ie(v: number): string {
  return v >= 1e9 ? `$${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`
    : v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`
    : v >= 1e4 ? `$${Math.round(v / 1e3)}K`
    : `$${Math.round(v).toLocaleString()}`;
}
function Qi(v: number): string { return Math.round(v).toLocaleString(); }

// Inline the key engine aliases used throughout
const Ur = carValue;
const T1 = carPower;
const B1 = passivePerSec;
const Vh = clickValue;
const f9 = calcUpgradeCost;
const d9 = spinReadyAt;
const y9 = spinSupercarPool;
const N = spinCashSlices;
const O1 = dailyReward;
const fr = levelFrom;
const Wy = RefreshCw;
const D1 = calcBuyPrice;
const pp = rollDealerStock;
const c9 = rollCrate;

// Rarity and data imports
import { RARITY_META, ACHIEVEMENTS, CAR_DEALERS } from "../../game/engine";

const dp = RARITY_META;
const Gh = ACHIEVEMENTS;
const Tc = CAR_DEALERS;
const q1 = 12; // SLICE_COUNT
const or = 360 / q1; // SLICE_DEG
const U9 = ["#b45309","#1f1f24","#2d2d33","#1f1f24","#7c3aed","#1f1f24","#2d2d33","#1f1f24","#d4af37","#1f1f24","#2d2d33","#1f1f24"];
const Oy: Record<number, {tier:number;pct:string;borderClass:string;labelBg:string}> = {
  0:{tier:1,pct:"1%",borderClass:"border-amber-300/70",labelBg:"bg-amber-400 text-amber-900"},
  4:{tier:2,pct:"0.01%",borderClass:"border-purple-400/70",labelBg:"bg-purple-400 text-purple-900"},
  8:{tier:3,pct:"0.001%",borderClass:"border-yellow-300/70",labelBg:"bg-yellow-300 text-yellow-900"},
};

// JSX factory
function h(tag: any, props: any, ...children: any[]): any {
  return React.createElement(tag, props, ...children);
}

function SectionHeader({
    eyebrow: a,
    title: n,
    hint: i
}) {
    return h("div", {
        className: "mb-5",
        children: [h("p", {
            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red",
            children: a
        }), h("h3", {
            className: "mt-1 font-display text-2xl font-black tracking-tight text-white",
            children: n
        }), i && h("p", {
            className: "mt-1 text-xs text-white/40",
            children: i
        })]
    })
}

function RarityBadge({
    rarity: a
}) {
    const n = dp[a];
    return n ? h("span", {
        className: "rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
        style: {
            borderColor: n.color,
            color: n.color,
            background: `${n.color}14`
        },
        children: n.label
    }) : null
}
const q1 = 12,
    or = 360 / q1,
    U9 = ["#b45309", "#1f1f24", "#2d2d33", "#1f1f24", "#7c3aed", "#1f1f24", "#2d2d33", "#1f1f24", "#d4af37", "#1f1f24", "#2d2d33", "#1f1f24"],
    Oy = {
        0: {
            tier: 1,
            pct: "1%",
            borderClass: "border-amber-300/70",
            labelBg: "bg-amber-400 text-amber-900"
        },
        4: {
            tier: 2,
            pct: "0.01%",
            borderClass: "border-purple-400/70",
            labelBg: "bg-purple-400 text-purple-900"
        },
        8: {
            tier: 3,
            pct: "0.001%",
            borderClass: "border-yellow-300/70",
            labelBg: "bg-yellow-300 text-yellow-900"
        }
    };

function SpinPanel({
    state: a,
    dispatch: n
}) {
    const [i, o] = React.useState(0), [u, c] = React.useState(!1), [h, m] = React.useState(null), f = a.lastTick, g = B1(f), x = Vh(f), y = Fh(f), v = f9(f), w = Math.max(1, Math.ceil((v - f) / 6e4)), S = w >= 60 ? `${Math.floor(w/60)}h ${w%60}m` : `${w}m`, j = d9(a), A = f >= j && !u, _ = Math.max(1, Math.ceil((j - f) / 6e4)), M = _ >= 60 ? `${Math.floor(_/60)}h ${_%60}m` : `${_}m`, N = O1(a), R = () => {
        if (!A) return;
        const z = y9(a);
        m(z), c(!0);
        const E = (360 - (z.slice * or + or / 2)) % 360;
        o(H => {
            const ee = (H % 360 + 360) % 360,
                Y = (E - ee + 360) % 360 + 360 * 5;
            return H + Y
        })
    }, L = h?.kind === "car" && h.carId ? Te[h.carId] : null, V = U9.map((z, E) => `${z} ${(E*or).toFixed(1)}deg ${((E+1)*or).toFixed(1)}deg`).join(", ");
    return h("div", {
        children: [h(yr, {
            eyebrow: "Lucky Spin",
            title: "SPIN THE WHEEL",
            hint: "Free every 15 minutes. Three car tiers rotate hourly: 1% → $10-30M, 0.01% → $100-300M, 0.001% → $1B+."
        }), h("div", {
            className: "grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr]",
            children: [h("div", {
                className: "relative mx-auto aspect-square w-full max-w-[600px]",
                children: [h("div", {
                    className: "absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2",
                    children: h("svg", {
                        width: "34",
                        height: "30",
                        viewBox: "0 0 34 30",
                        className: "drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]",
                        children: [h("path", {
                            d: "M17 30 L4 6 A17 17 0 0 1 30 6 Z",
                            fill: "#ff2e00"
                        }), h("circle", {
                            cx: "17",
                            cy: "8",
                            r: "3",
                            fill: "#0b0b0c"
                        })]
                    })
                }), h(Ge.div, {
                    className: "absolute inset-0 rounded-full border-[3px] border-[#3a3a40]",
                    style: {
                        background: `conic-gradient(${V})`
                    },
                    animate: {
                        rotate: i
                    },
                    transition: {
                        duration: 4.5,
                        ease: [.12, .75, .2, 1]
                    },
                    onAnimationComplete: () => {
                        h && (n({
                            type: "SPIN",
                            now: Date.now(),
                            result: h
                        }), c(!1))
                    },
                    children: [
                        [{
                            car: g,
                            sliceIdx: 0
                        }, {
                            car: x,
                            sliceIdx: 4
                        }, {
                            car: y,
                            sliceIdx: 8
                        }].map(({
                            car: z,
                            sliceIdx: E
                        }) => {
                            if (!z) return null;
                            const H = Oy[E],
                                ee = (E * or + or / 2) * Math.PI / 180,
                                Y = 30;
                            return h("div", {
                                className: `absolute overflow-hidden rounded-md border-2 ${H.borderClass}`,
                                style: {
                                    left: `${50+Y*Math.sin(ee)}%`,
                                    top: `${50-Y*Math.cos(ee)}%`,
                                    width: "17%",
                                    aspectRatio: "16/10",
                                    transform: "translate(-50%, -50%)",
                                    boxShadow: "0 4px 18px rgba(0,0,0,0.55)",
                                    zIndex: 10
                                },
                                children: [h(Ha, {
                                    src: es(z),
                                    alt: z.name,
                                    seed: z.id,
                                    className: "h-full w-full object-cover"
                                }), h("span", {
                                    className: `absolute left-1 top-1 rounded px-1 py-0.5 text-[7px] font-black uppercase ${H.labelBg}`,
                                    children: H.pct
                                })]
                            }, H.tier)
                        }), Array.from({
                            length: q1
                        }, (z, E) => {
                            const H = (E * or + or / 2) * Math.PI / 180,
                                ee = 37,
                                Y = 50 + ee * Math.sin(H),
                                J = 50 - ee * Math.cos(H),
                                Z = Oy[E];
                            let re;
                            if (Z) re = `★ ${Z.pct}`;
                            else {
                                const T = [1, 2, 3, 5, 6, 7, 9, 10, 11].indexOf(E),
                                    $ = N[T] ?? 0;
                                re = $ >= 1e3 ? `$${($/1e3).toFixed(1)}K` : `$${$}`
                            }
                            return h("span", {
                                className: "absolute -translate-x-1/2 -translate-y-1/2 font-display text-[10px] font-black uppercase tracking-tight text-white/85",
                                style: {
                                    left: `${Y}%`,
                                    top: `${J}%`,
                                    textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                                    zIndex: 20
                                },
                                children: re
                            }, E)
                        }), h("div", {
                            className: "absolute left-1/2 top-1/2 z-10 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#3a3a40] bg-[#0b0b0c]",
                            children: h("span", {
                                className: "font-display text-[9px] font-black uppercase tracking-[0.1em] text-apex-red",
                                children: "Spin"
                            })
                        })
                    ]
                })]
            }), h("div", {
                className: "flex flex-col justify-center",
                children: [h("button", {
                    type: "button",
                    disabled: !A,
                    onClick: R,
                    className: "rounded-md bg-apex-red py-3 font-display text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30",
                    children: u ? "Spinning…" : A ? "SPIN — FREE" : `Next spin in ${M}`
                }), h("p", {
                    className: "mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35",
                    children: "1% ($10-30M) · 0.01% ($100-300M) · 0.001% ($1B+) · free every 15 min"
                }), h("div", {
                    className: "mt-6 space-y-3",
                    children: [h("div", {
                        className: "flex items-center justify-between",
                        children: [h("p", {
                            className: "font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40",
                            children: "This hour's cars"
                        }), h("span", {
                            className: "inline-flex items-center gap-1 rounded-md border border-amber-300/30 bg-amber-300/5 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300",
                            children: [h(Wy, {
                                className: "size-2.5"
                            }), S]
                        })]
                    }), [{
                        car: g,
                        tier: 1,
                        pct: "1%",
                        color: "#f59e0b",
                        range: "$10M – $30M"
                    }, {
                        car: Vh(f),
                        tier: 2,
                        pct: "0.01%",
                        color: "#c084fc",
                        range: "$100M – $300M"
                    }, {
                        car: Fh(f),
                        tier: 3,
                        pct: "0.001%",
                        color: "#ffd700",
                        range: "$1B+"
                    }].map(({
                        car: z,
                        tier: E,
                        pct: H,
                        color: ee,
                        range: Y
                    }) => z ? h("div", {
                        className: "overflow-hidden rounded-xl border bg-apex-panel",
                        style: {
                            borderColor: `${ee}40`
                        },
                        children: h("div", {
                            className: "flex gap-3 p-3",
                            children: [h("div", {
                                className: "relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[#0a0a0b]",
                                children: h(Ha, {
                                    src: es(z),
                                    alt: z.name,
                                    seed: z.id,
                                    className: "h-full w-full object-cover"
                                })
                            }), h("div", {
                                className: "flex flex-1 flex-col justify-center min-w-0",
                                children: [h("div", {
                                    className: "flex items-center gap-2",
                                    children: [h("span", {
                                        className: "rounded-sm px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-wider",
                                        style: {
                                            background: `${ee}20`,
                                            color: ee,
                                            border: `1px solid ${ee}40`
                                        },
                                        children: H
                                    }), h("span", {
                                        className: "text-[10px] text-white/30",
                                        children: Y
                                    })]
                                }), h("p", {
                                    className: "mt-1 truncate font-display text-sm font-black text-white",
                                    children: z.name
                                }), h("p", {
                                    className: "truncate text-[10px] text-white/35",
                                    children: [z.brand, " · ", Ie(z.value)]
                                })]
                            })]
                        })
                    }, E) : null)]
                }), h("div", {
                    className: "mt-6 min-h-[7.5rem] rounded-xl border border-apex-line bg-apex-panel p-5 text-center",
                    children: h(ts, {
                        mode: "wait",
                        children: u ? h(Ge.p, {
                            initial: {
                                opacity: 0
                            },
                            animate: {
                                opacity: 1
                            },
                            exit: {
                                opacity: 0
                            },
                            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
                            children: "Spinning… the wheel decides your fate"
                        }, "spinning") : h ? L ? h(Ge.div, {
                            initial: {
                                opacity: 0,
                                scale: .8,
                                y: 8
                            },
                            animate: {
                                opacity: 1,
                                scale: 1,
                                y: 0
                            },
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 18
                            },
                            children: [h("p", {
                                className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300",
                                children: [h.tier === 3 ? "ULTRA RARE" : h.tier === 2 ? "MYTHIC" : "SUPERCAR", " WON!"]
                            }), h("p", {
                                className: "mt-2 font-display text-2xl font-black text-white",
                                children: L.name
                            }), h("p", {
                                className: "mt-1 text-xs text-white/40",
                                children: [L.brand, " · ", Ie(L.value), " · ", Qi(L.hp), " hp"]
                            }), h("p", {
                                className: "mt-1 text-[10px] font-bold text-green-400",
                                children: "Added to your garage!"
                            })]
                        }, `won-${h.carId}`) : h(Ge.div, {
                            initial: {
                                opacity: 0,
                                scale: .8,
                                y: 8
                            },
                            animate: {
                                opacity: 1,
                                scale: 1,
                                y: 0
                            },
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 18
                            },
                            children: [h("p", {
                                className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
                                children: "You won"
                            }), h("p", {
                                className: "mt-2 font-display text-4xl font-black text-apex-red",
                                children: ["+", Ie(h.amount ?? 0)]
                            })]
                        }, `won-${h.amount}`) : h(Ge.p, {
                            initial: {
                                opacity: 0
                            },
                            animate: {
                                opacity: 1
                            },
                            exit: {
                                opacity: 0
                            },
                            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
                            children: "Good luck — the wheel is rigged in your favour… barely."
                        }, "idle")
                    })
                })]
            })]
        })]
    })
}

function GaragePanel({
    state: a,
    dispatch: n
}) {
    const i = Object.keys(a.ownedCars),
        o = i.map(c => Te[c]).filter(c => !!c).sort((c, h) => Ur(a, h.id) - Ur(a, c.id)),
        u = i.length > 1;
    return h("div", {
        children: [h(yr, {
            eyebrow: "Collection",
            title: "YOUR GARAGE",
            hint: `${i.length} machine${i.length===1?"":"s"} · total value ${Ie(o.reduce((c,h)=>c+Ur(a,h.id),0))}`
        }), o.length === 0 ? h("p", {
            className: "text-sm text-white/40",
            children: "No cars yet. Visit the dealers."
        }) : h("div", {
            className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            children: o.map(c => {
                const h = c.id === a.activeCarId,
                    m = Object.values(a.ownedCars[c.id]?.upgrades ?? {}).reduce((f, g) => f + g, 0);
                return h("div", {
                    className: ce("group relative overflow-hidden rounded-xl border bg-apex-panel transition-colors", h ? "border-apex-red/60" : "border-apex-line hover:border-white/25"),
                    children: [h("div", {
                        className: "relative h-36 overflow-hidden bg-[#0a0a0b]",
                        children: [h(Ha, {
                            src: es(c),
                            alt: c.name,
                            seed: c.id,
                            className: "h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                        }), h("div", {
                            className: "absolute left-2 top-2",
                            children: h(mp, {
                                rarity: c.rarity
                            })
                        }), h && h("span", {
                            className: "absolute right-2 top-2 rounded-sm bg-apex-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white",
                            children: "Active"
                        })]
                    }), h("div", {
                        className: "p-4",
                        children: [h("p", {
                            className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40",
                            children: [c.brand, " · ", c.year]
                        }), h("h4", {
                            className: "mt-0.5 font-display text-lg font-black tracking-tight text-white",
                            children: c.name
                        }), h("div", {
                            className: "mt-3 flex items-center justify-between text-[11px]",
                            children: [h("span", {
                                className: "text-white/40",
                                children: [h("span", {
                                    className: "font-display font-black text-apex-red",
                                    children: Ie(Ur(a, c.id))
                                }), " ", "value"]
                            }), h("span", {
                                className: "text-white/40",
                                children: [h("span", {
                                    className: "font-display font-black text-white",
                                    children: Qi(T1(a, c.id))
                                }), " ", "hp"]
                            }), h("span", {
                                className: "text-white/40",
                                children: [m, " upgrades"]
                            })]
                        }), h("div", {
                            className: "mt-3 flex gap-2",
                            children: [!h && h("button", {
                                type: "button",
                                onClick: () => n({
                                    type: "SET_ACTIVE",
                                    id: c.id
                                }),
                                className: "flex-1 rounded-md border border-apex-red/40 bg-apex-red/10 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red",
                                children: "Drive"
                            }), h("button", {
                                type: "button",
                                disabled: !u,
                                onClick: () => {
                                    window.confirm(`Sell the ${c.name} for ${Ie(Math.round(Ur(a,c.id)*.35))}?`) && n({
                                        type: "SELL_CAR",
                                        id: c.id
                                    })
                                },
                                className: "flex-1 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-apex-red hover:text-apex-red disabled:cursor-not-allowed disabled:opacity-30",
                                children: "Sell"
                            })]
                        })]
                    })]
                }, c.id)
            })
        })]
    })
}

function DealerPanel({
    state: a,
    dispatch: n
}) {
    const i = fr(a);
    return h("div", {
        children: [h(yr, {
            eyebrow: "Dealerships",
            title: "BUY MACHINES",
            hint: "Stock rotates when you refresh it. Level up to unlock the bigger showrooms."
        }), h("div", {
            className: "grid grid-cols-1 gap-4 lg:grid-cols-2",
            children: Tc.map(o => {
                const u = i < o.unlockLevel,
                    c = a.dealerStock[o.id] ?? [];
                return h("div", {
                    className: ce("rounded-xl border bg-apex-panel p-4", u ? "border-white/10 opacity-60" : "border-apex-line"),
                    children: [h("div", {
                        className: "mb-3 flex items-start justify-between gap-2",
                        children: [h("div", {
                            children: [h("h4", {
                                className: "font-display text-lg font-black tracking-tight text-white",
                                children: o.name
                            }), h("p", {
                                className: "text-[11px] text-white/40",
                                children: o.tagline
                            })]
                        }), u ? h("span", {
                            className: "rounded-sm border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50",
                            children: ["Level ", o.unlockLevel]
                        }) : h("button", {
                            type: "button",
                            disabled: a.cash < o.refreshCost,
                            onClick: () => n({
                                type: "REFRESH_DEALER",
                                dealerId: o.id,
                                stock: pp(o),
                                refreshAt: Date.now(),
                                cost: o.refreshCost
                            }),
                            className: "inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white disabled:opacity-30",
                            children: [h(Wy, {
                                className: "size-3"
                            }), Ie(o.refreshCost)]
                        })]
                    }), u ? h("p", {
                        className: "text-xs text-white/30",
                        children: ["Reach level ", o.unlockLevel, " to walk this floor."]
                    }) : h("div", {
                        className: "grid grid-cols-2 gap-3",
                        children: c.map(h => {
                            const m = Te[h];
                            if (!m) return null;
                            const f = !!a.ownedCars[h],
                                g = i >= m.unlockLevel,
                                x = D1(h),
                                y = !f && g && a.cash >= x;
                            return h("div", {
                                className: "overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0d]",
                                children: [h("div", {
                                    className: "relative h-20 bg-[#0a0a0b]",
                                    children: [h(Ha, {
                                        src: es(m),
                                        alt: m.name,
                                        seed: h,
                                        className: "h-full w-full object-cover"
                                    }), h("div", {
                                        className: "absolute left-1.5 top-1.5",
                                        children: h(mp, {
                                            rarity: m.rarity
                                        })
                                    })]
                                }), h("div", {
                                    className: "p-2.5",
                                    children: [h("p", {
                                        className: "truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40",
                                        children: [m.brand, " · ", m.year]
                                    }), h("p", {
                                        className: "truncate font-display text-sm font-black text-white",
                                        children: m.name
                                    }), h("div", {
                                        className: "mt-1.5 flex items-center justify-between",
                                        children: [h("span", {
                                            className: "font-display text-xs font-black text-apex-red",
                                            children: Ie(x)
                                        }), h("button", {
                                            type: "button",
                                            disabled: !y,
                                            onClick: () => n({
                                                type: "BUY_CAR",
                                                id: h
                                            }),
                                            className: "rounded-md bg-apex-red px-2 py-1 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30",
                                            children: f ? "Owned" : g ? "Buy" : `Lv ${m.unlockLevel}`
                                        })]
                                    })]
                                })]
                            }, h)
                        })
                    })]
                }, o.id)
            })
        })]
    })
}

function CratePanel({
    state: a,
    dispatch: n
}) {
    const [i, o] = React.useState(null), u = c => {
        const h = c9(a, c);
        n({
            type: "OPEN_CRATE",
            crateId: c,
            result: h
        }), o(h)
    };
    return h("div", {
        children: [h(yr, {
            eyebrow: "Loot",
            title: "CAR CRATES",
            hint: `${a.cratesOpened} crates opened. Cars, parts or cash inside — rarity decides everything.`
        }), h("div", {
            className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            children: v1.map(c => {
                const h = B9[c.icon] ?? No,
                    m = a.cash >= c.cost;
                return h("div", {
                    className: "group flex flex-col rounded-xl border border-apex-line bg-apex-panel p-5 transition-colors hover:border-white/25",
                    children: [h("div", {
                        className: "mb-4 flex size-12 items-center justify-center rounded-lg border",
                        style: {
                            borderColor: c.color,
                            color: c.color,
                            background: `${c.color}14`
                        },
                        children: h(h, {
                            className: "size-6"
                        })
                    }), h("h4", {
                        className: "font-display text-lg font-black tracking-tight text-white",
                        children: c.name
                    }), h("p", {
                        className: "mt-1 flex-1 text-xs text-white/40",
                        children: c.desc
                    }), h("div", {
                        className: "mt-4 flex items-center justify-between",
                        children: [h("span", {
                            className: "font-display text-sm font-black text-apex-red",
                            children: Ie(c.cost)
                        }), h("button", {
                            type: "button",
                            disabled: !m,
                            onClick: () => u(c.id),
                            className: "rounded-md border border-apex-red/50 bg-apex-red/10 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30",
                            children: "Open"
                        })]
                    })]
                }, c.id)
            })
        }), h(ts, {
            children: i && h(Ge.div, {
                initial: {
                    opacity: 0
                },
                animate: {
                    opacity: 1
                },
                exit: {
                    opacity: 0
                },
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm",
                onClick: () => o(null),
                children: h(Ge.div, {
                    initial: {
                        scale: .7,
                        opacity: 0
                    },
                    animate: {
                        scale: 1,
                        opacity: 1
                    },
                    exit: {
                        scale: .8,
                        opacity: 0
                    },
                    transition: {
                        type: "spring",
                        stiffness: 220,
                        damping: 18
                    },
                    onClick: c => c.stopPropagation(),
                    className: "w-full max-w-sm rounded-2xl border border-white/15 bg-[#101012] p-6 text-center shadow-2xl",
                    children: [i.kind === "car" && i.carId && Te[i.carId] && h(I9, {
                        carId: i.carId
                    }), i.kind === "part" && i.partId && h("div", {
                        children: [h("p", {
                            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
                            children: "Part dropped"
                        }), h("p", {
                            className: "mt-2 font-display text-2xl font-black text-white",
                            children: Ec.find(c => c.id === i.partId)?.name ?? "Part"
                        })]
                    }), i.kind === "cash" && h("div", {
                        children: [h("p", {
                            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
                            children: "Cash found"
                        }), h("p", {
                            className: "mt-2 font-display text-3xl font-black text-apex-red",
                            children: ["+", Ie(i.cash ?? 0)]
                        })]
                    }), h("button", {
                        type: "button",
                        onClick: () => o(null),
                        className: "mt-6 w-full rounded-md border border-white/15 py-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-apex-red hover:text-white",
                        children: "Claim"
                    })]
                })
            })
        })]
    })
}

function CrateAnimation({
    carId: a
}) {
    const n = Te[a];
    if (!n) return null;
    const i = dp[n.rarity];
    return h("div", {
        children: [h("p", {
            className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40",
            children: "Car unlocked"
        }), h("div", {
            className: "mx-auto mt-4 h-32 w-full overflow-hidden rounded-lg border",
            style: {
                borderColor: i.color,
                boxShadow: `0 0 40px ${i.color}33`
            },
            children: h(Ha, {
                src: es(n),
                alt: n.name,
                seed: a,
                className: "h-full w-full object-cover"
            })
        }), h("p", {
            className: "mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]",
            style: {
                color: i.color
            },
            children: i.label
        }), h("p", {
            className: "mt-1 font-display text-2xl font-black text-white",
            children: n.name
        }), h("p", {
            className: "text-xs text-white/40",
            children: [n.brand, " · ", Ie(n.value), " · ", Qi(n.hp), " hp"]
        })]
    })
}

function UpgradePanel({
    state: a,
    dispatch: n
}) {
    const i = Te[a.activeCarId] ?? Te[mr],
        o = a.ownedCars[a.activeCarId]?.upgrades ?? {},
        u = ["restore", "performance", "handling", "cosmetic"];
    return h("div", {
        children: [h(yr, {
            eyebrow: "Workshop",
            title: `UPGRADE · ${i.name.toUpperCase()}`,
            hint: "Every stage costs more. Restoration multiplies everything; performance boosts clicks, income or power."
        }), h("div", {
            className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
            children: u.map(c => h("div", {
                className: "rounded-xl border border-apex-line bg-apex-panel p-4",
                children: [h("h4", {
                    className: "mb-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/50",
                    children: $9[c]
                }), h("div", {
                    className: "space-y-3",
                    children: hp.filter(h => h.category === c).map(h => {
                        const m = o[h.id] ?? 0,
                            f = m >= h.stages.length,
                            g = L1(a, a.activeCarId, h.id),
                            x = O9[h.icon] ?? Zy,
                            y = !f && a.cash >= g;
                        return h("div", {
                            className: "flex items-center gap-3 rounded-lg border border-white/10 bg-[#0c0c0d] p-3",
                            children: [h("div", {
                                className: "flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/60",
                                children: h(x, {
                                    className: "size-4"
                                })
                            }), h("div", {
                                className: "min-w-0 flex-1",
                                children: [h("div", {
                                    className: "flex items-center justify-between gap-2",
                                    children: [h("p", {
                                        className: "truncate font-display text-sm font-bold text-white",
                                        children: h.name
                                    }), h("span", {
                                        className: "shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40",
                                        children: f ? "Maxed" : `Stage ${m+1}/${h.stages.length}`
                                    })]
                                }), h("p", {
                                    className: "truncate text-[10px] text-white/35",
                                    children: h.desc
                                }), h("div", {
                                    className: "mt-2 flex items-center gap-1",
                                    children: h.stages.map((v, w) => h("span", {
                                        className: ce("h-1 flex-1 rounded-full", w < m ? "bg-apex-red" : "bg-white/10")
                                    }, w))
                                })]
                            }), h("button", {
                                type: "button",
                                disabled: !y,
                                onClick: () => n({
                                    type: "BUY_UPGRADE",
                                    upgradeId: h.id
                                }),
                                className: "shrink-0 rounded-md bg-apex-red px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30",
                                children: f ? "Maxed" : Ie(g)
                            })]
                        }, h.id)
                    })
                })]
            }, c))
        })]
    })
}

function PartsBin({
    state: a,
    dispatch: n
}) {
    const i = Ec.filter(o => (a.inventory[o.id] ?? 0) > 0);
    return h("div", {
        children: [h(yr, {
            eyebrow: "Parts Bin",
            title: "INVENTORY",
            hint: "Held parts add permanent global bonuses per copy. Sell duplicates for cash."
        }), i.length === 0 ? h("p", {
            className: "text-sm text-white/40",
            children: "Empty. Open crates to collect performance parts."
        }) : h("div", {
            className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
            children: i.map(o => {
                const u = a.inventory[o.id] ?? 0,
                    c = [o.clickMult ? `+${Math.round(o.clickMult*100)}% click` : "", o.passiveMult ? `+${Math.round(o.passiveMult*100)}% income` : ""].filter(Boolean).join(" · ");
                return h("div", {
                    className: "rounded-xl border border-apex-line bg-apex-panel p-4",
                    children: [h("div", {
                        className: "flex items-start justify-between gap-2",
                        children: [h("div", {
                            children: [h(mp, {
                                rarity: o.rarity
                            }), h("h4", {
                                className: "mt-2 font-display text-base font-black text-white",
                                children: o.name
                            })]
                        }), h("span", {
                            className: "rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70",
                            children: ["×", u]
                        })]
                    }), h("p", {
                        className: "mt-1 text-[11px] text-white/40",
                        children: o.desc
                    }), h("p", {
                        className: "mt-1 text-[11px] font-semibold text-apex-red",
                        children: c || "Cosmetic"
                    }), h("button", {
                        type: "button",
                        onClick: () => n({
                            type: "SELL_PART",
                            partId: o.id
                        }),
                        className: "mt-3 w-full rounded-md border border-white/15 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-apex-red",
                        children: ["Sell for ", Ie(o.value)]
                    })]
                }, o.id)
            })
        })]
    })
}

function AchievementsPanel({
    state: a
}) {
    return h("div", {
        children: [h(yr, {
            eyebrow: "Achievements",
            title: "ACHIEVEMENTS",
            hint: `${a.achievements.length}/${Gh.length} unlocked. Rewards pay out automatically.`
        }), h("div", {
            className: "grid grid-cols-1 gap-2 sm:grid-cols-2",
            children: Gh.map(n => {
                const i = a.achievements.includes(n.id);
                return h("div", {
                    className: ce("flex items-center gap-3 rounded-lg border px-4 py-3", i ? "border-apex-red/40 bg-apex-red/5" : "border-white/10 bg-apex-panel opacity-70"),
                    children: [h("span", {
                        className: ce("flex size-8 shrink-0 items-center justify-center rounded-full border font-display text-xs font-black", i ? "border-apex-red bg-apex-red text-white" : "border-white/15 text-white/30"),
                        children: i ? "✓" : "•"
                    }), h("div", {
                        className: "min-w-0",
                        children: [h("p", {
                            className: ce("truncate font-display text-sm font-bold", i ? "text-white" : "text-white/60"),
                            children: n.name
                        }), h("p", {
                            className: "truncate text-[11px] text-white/40",
                            children: n.desc
                        })]
                    }), (n.rewardCash ?? 0) > 0 && h("span", {
                        className: "ml-auto shrink-0 text-[11px] font-bold text-apex-red",
                        children: Ie(n.rewardCash ?? 0)
                    })]
                }, n.id)
            })
        })]
    })
}

function PrestigePanel({
    state: a,
    dispatch: n
}) {
    const i = 5e3 * (a.prestigeLevel + 1),
        o = a.reputation >= i;
    return h("div", {
        children: [h(yr, {
            eyebrow: "Rebirth",
            title: "PRESTIGE",
            hint: "Reset cash, cars, parts and stock for a permanent +50% income/click bonus per level."
        }), h("div", {
            className: "max-w-lg rounded-xl border border-apex-line bg-apex-panel p-5",
            children: [h("div", {
                className: "flex items-center gap-3",
                children: [h(n_, {
                    className: "size-5 text-apex-red"
                }), h("div", {
                    children: [h("p", {
                        className: "font-display text-lg font-black text-white",
                        children: ["Reputation ", Qi(a.reputation), " / ", Qi(i)]
                    }), h("p", {
                        className: "text-[11px] text-white/40",
                        children: ["Prestige level ", a.prestigeLevel, " · next bonus +50% earnings"]
                    })]
                })]
            }), h("div", {
                className: "mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10",
                children: h("div", {
                    className: "h-full rounded-full bg-apex-red",
                    style: {
                        width: `${Math.min(100,a.reputation/i*100)}%`
                    }
                })
            }), h("div", {
                className: "mt-4 space-y-1 text-[11px] text-white/40",
                children: [h("p", {
                    children: "Keeps: prestige level, achievements, lifetime earnings."
                }), h("p", {
                    children: "Resets: cash, cars, parts, dealer stock, daily streak."
                })]
            }), h("button", {
                type: "button",
                disabled: !o,
                onClick: () => {
                    window.confirm("Prestige now? You will lose all cars and cash for a permanent +50% bonus.") && (n({
                        type: "PRESTIGE"
                    }), ye.success(`Prestige ${a.prestigeLevel+1} reached`))
                },
                className: "mt-4 w-full rounded-md bg-apex-red py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30",
                children: o ? "Prestige" : `Need ${Qi(i-a.reputation)} more rep`
            })]
        }), h("div", {
            className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3",
            children: [Co, Ua, No].map((u, c) => h("div", {
                className: "rounded-xl border border-apex-line bg-apex-panel p-4",
                children: [h(u, {
                    className: "size-5 text-apex-red"
                }), h("p", {
                    className: "mt-2 font-display text-sm font-bold text-white",
                    children: ["+50% earnings", "+2.5× clicks", "Better luck"][c]
                }), h("p", {
                    className: "text-[10px] text-white/40",
                    children: "per prestige level"
                })]
            }, c))
        })]
    })
}
const By = [{
    id: "earn",
    label: "Earn",
    icon: Ky
}, {
    id: "spin",
    label: "Spin",
    icon: hw
}, {
    id: "garage",
    label: "Garage",
    icon: ga
}, {
    id: "dealer",
    label: "Dealers",
    icon: cS
}, {
    id: "crates",
    label: "Crates",
    icon: C_
}, {
    id: "upgrades",
    label: "Upgrades",
    icon: Zy
}, {
    id: "inventory",
    label: "Parts",
    icon: Kv
}, {
    id: "casino",
    label: "Casino",
    icon: Ew
}, {
    id: "achievements",
    label: "Achievements",
    icon: Yh
}, {
    id: "prestige",
    label: "Prestige",
    icon: No
}];

function CountdownTimer({
    expiresAt: a
}) {
    const [n, i] = React.useState(Math.max(0, a - Date.now()));
    if (React.useEffect(() => {
            const f = () => i(Math.max(0, a - Date.now()));
            f();
            const g = setInterval(f, 1e3);
            return () => clearInterval(g)
        }, [a]), n <= 0) return h("span", {
        className: "text-white/30",
        children: "Expired"
    });
    const o = Math.ceil(n / 1e3),
        u = Math.floor(o / 3600),
        c = Math.floor(o % 3600 / 60),
        h = o % 60,
        m = [];
    return u > 0 && m.push(`${u}h`), (c > 0 || u > 0) && m.push(`${c}m`), m.push(`${h}s`), h("span", {
        className: "font-mono text-apex-red tabular-nums",
        children: m.join(" ")
    })
}

function X9({
    state: a,
    dispatch: n,
    globalMultiplier: i = 1,
    activeEvent: o
}) {
    const [u, c] = React.useState("earn"), [h, m] = React.useState([]), f = React.useRef(0), g = Te[a.activeCarId] ?? Te[mr], x = fr(a), y = a.cash, v = Math.round(z1(a) * i), w = Math.round(o9(a) * i), S = dp[g.rarity], j = (a.ownedCars[a.activeCarId]?.upgrades.condition ?? 0) / 6, A = a.lastTick, _ = x9(a, A), M = A >= a.daily.nextClaimAt, N = M ? 0 : Math.max(1, Math.ceil((a.daily.nextClaimAt - A) / 6e4)), R = N >= 60 ? `${Math.floor(N/60)}h ${N%60}m` : `${N}m`, L = Math.max(1, x - a.prestigeLevel * 10), V = (Math.pow(L, 2) - Math.pow(L - 1, 2)) * 500, z = Math.max(0, a.totalEarned - Math.pow(L - 1, 2) * 500), E = Math.min(100, z / Math.max(1, V) * 100), H = Math.pow(L, 2) * 500, ee = re => {
        const te = Math.random() < v9(a),
            T = Math.round(w * (te ? 5 : 1));
        n({
            type: "CLICK",
            amount: T,
            globalMultiplier: i
        });
        const $ = re.currentTarget.getBoundingClientRect(),
            W = ++f.current,
            se = {
                id: W,
                x: re.clientX - $.left + (Math.random() * 40 - 20),
                y: re.clientY - $.top - 10,
                text: te ? `CRITICAL +${Ie(T)}` : `+${Ie(T)}`,
                crit: te
            };
        m(K => [...K.slice(-24), se]), window.setTimeout(() => {
            m(K => K.filter(fe => fe.id !== W))
        }, 900)
    }, Y = () => {
        if (!M) {
            ye.error(`Daily unlocks in ${R}`);
            return
        }
        n({
            type: "CLAIM_DAILY",
            reward: _,
            now: A
        }), ye.success(`Daily reward claimed: ${Ie(_)}`)
    }, J = () => {
        localStorage.setItem("supercars.game.v1", JSON.stringify(a)), ye.success("Game saved")
    }, Z = () => {
        window.confirm("Hard reset erases ALL game progress. Continue?") && n({
            type: "HARD_RESET"
        })
    };
    return h("div", {
        className: "px-3 py-4 sm:px-5 lg:px-7",
        children: [o && h(Ge.div, {
            initial: {
                opacity: 0,
                y: -10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            className: "mb-4 overflow-hidden rounded-xl border border-apex-red/50 bg-gradient-to-r from-apex-red/20 via-orange-600/20 to-apex-red/20 p-4",
            children: h("div", {
                className: "flex items-center justify-between",
                children: [h("div", {
                    className: "flex items-center gap-3",
                    children: [h("span", {
                        className: "flex size-10 items-center justify-center rounded-lg bg-apex-red/30 animate-pulse",
                        children: h(Wh, {
                            className: "size-5 text-apex-red"
                        })
                    }), h("div", {
                        children: [h("p", {
                            className: "font-display text-sm font-black uppercase tracking-wider text-apex-red",
                            children: o.label
                        }), h("p", {
                            className: "text-[11px] text-white/50",
                            children: ["All earnings multiplied · Expires in ", h(Y9, {
                                expiresAt: o.expiresAt
                            })]
                        })]
                    })]
                }), h("span", {
                    className: "font-display text-2xl font-black text-apex-red",
                    children: [o.multiplier, "x"]
                })]
            })
        }), h("div", {
            className: "mb-5 flex flex-wrap items-center justify-between gap-3",
            children: [h("div", {
                children: [h("p", {
                    className: "inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red",
                    children: [h("span", {
                        className: "inline-block size-2 rounded-full bg-apex-red"
                    }), "The Garage Tycoon"]
                }), h("h1", {
                    className: "mt-1 font-display text-3xl font-black tracking-tight text-white sm:text-4xl",
                    children: "GAME"
                })]
            }), h("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [h(ro, {
                    icon: vw,
                    label: "Cash",
                    value: Ie(y),
                    accent: !0
                }), h(ro, {
                    icon: Wi,
                    label: "Income/s",
                    value: Ie(v)
                }), h(ro, {
                    icon: yc,
                    label: "Level",
                    value: String(x)
                }), h(ro, {
                    icon: gc,
                    label: "Rep",
                    value: String(Math.round(a.reputation).toLocaleString())
                }), h(ro, {
                    icon: ga,
                    label: "Cars",
                    value: String(Object.keys(a.ownedCars).length)
                })]
            })]
        }), h("div", {
            className: "mb-4 flex flex-wrap items-center gap-2 lg:hidden",
            children: [h("button", {
                type: "button",
                onClick: Y,
                disabled: !M,
                className: "inline-flex items-center gap-2 rounded-md border border-apex-red/40 bg-apex-red/10 px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40",
                children: [h(fh, {
                    className: "size-4 text-apex-red"
                }), M ? `Daily ${Ie(_)}` : `Daily in ${R}`, a.daily.streak > 1 && h("span", {
                    className: "rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]",
                    children: ["×", a.daily.streak]
                })]
            }), h("button", {
                type: "button",
                onClick: J,
                className: "inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white",
                children: [h(xh, {
                    className: "size-4"
                }), " Save"]
            }), h("button", {
                type: "button",
                onClick: Z,
                className: "inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red",
                children: [h(Ir, {
                    className: "size-4"
                }), " Reset"]
            })]
        }), h("div", {
            className: "flex items-start gap-4",
            children: [h("aside", {
                className: "sticky top-20 hidden w-[21rem] shrink-0 flex-col gap-3 lg:flex",
                children: [h("div", {
                    className: "rounded-xl border border-apex-line bg-apex-panel p-4",
                    children: [h("p", {
                        className: "text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40",
                        children: "Cash"
                    }), h("p", {
                        className: "mt-1 font-display text-3xl font-black tracking-tight text-white",
                        children: Ie(y)
                    }), h("div", {
                        className: "mt-3 grid grid-cols-2 gap-2 border-t border-apex-line pt-3 text-center",
                        children: [h("div", {
                            children: [h("p", {
                                className: "font-display text-sm font-black text-apex-red",
                                children: Ie(v)
                            }), h("p", {
                                className: "text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35",
                                children: "/sec"
                            })]
                        }), h("div", {
                            children: [h("p", {
                                className: "font-display text-sm font-black text-white",
                                children: Ie(w)
                            }), h("p", {
                                className: "text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35",
                                children: "click"
                            })]
                        })]
                    })]
                }), h("div", {
                    className: "rounded-xl border border-apex-line bg-apex-panel p-4",
                    children: [h("div", {
                        className: "flex items-center justify-between",
                        children: [h("span", {
                            className: "font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white",
                            children: ["Level ", x]
                        }), h("span", {
                            className: "text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40",
                            children: ["Prestige ", a.prestigeLevel]
                        })]
                    }), h("div", {
                        className: "mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10",
                        children: h(Ge.div, {
                            className: "h-full rounded-full bg-apex-red",
                            animate: {
                                width: `${E}%`
                            },
                            transition: {
                                duration: .4
                            }
                        })
                    }), h("p", {
                        className: "mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35",
                        children: [Ie(z), " / ", Ie(V), " xp · next at ", Ie(H), " earned"]
                    })]
                }), h("nav", {
                    className: "flex flex-col gap-1 rounded-xl border border-apex-line bg-apex-panel p-2",
                    children: By.map(re => {
                        const te = re.icon,
                            T = u === re.id;
                        return h("button", {
                            type: "button",
                            onClick: () => c(re.id),
                            className: ce("flex items-center gap-3 rounded-md px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] transition-colors", T ? "border-l-2 border-apex-red bg-apex-red/10 text-white" : "border-l-2 border-transparent text-white/45 hover:bg-white/5 hover:text-white"),
                            children: [h(te, {
                                className: ce("size-4", T ? "text-apex-red" : "text-white/40")
                            }), re.label]
                        }, re.id)
                    })
                }), h("div", {
                    className: "mt-auto rounded-xl border border-apex-line bg-apex-panel p-3",
                    children: [h("button", {
                        type: "button",
                        onClick: Y,
                        disabled: !M,
                        className: ce("flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] transition-colors", M ? "bg-apex-red text-white hover:bg-apex-red/80" : "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"),
                        children: [h(fh, {
                            className: ce("size-4", M ? "text-white" : "text-white/40")
                        }), M ? `Daily ${Ie(_)}` : `Daily in ${R}`, a.daily.streak > 1 && h("span", {
                            className: "rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]",
                            children: ["×", a.daily.streak]
                        })]
                    }), h("div", {
                        className: "mt-2 grid grid-cols-2 gap-2",
                        children: [h("button", {
                            type: "button",
                            onClick: J,
                            className: "inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white",
                            children: [h(xh, {
                                className: "size-3.5"
                            }), " Save"]
                        }), h("button", {
                            type: "button",
                            onClick: Z,
                            className: "inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red",
                            children: [h(Ir, {
                                className: "size-3.5"
                            }), " Reset"]
                        })]
                    }), h("p", {
                        className: "mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25",
                        children: "Garage Tycoon · v1"
                    })]
                })]
            }), h("main", {
                className: "min-w-0 flex-1",
                children: [u === "earn" ? h(J9, {
                    state: a,
                    active: g,
                    rarityMeta: S,
                    condition: j,
                    perClick: w,
                    income: v,
                    popups: h,
                    onCarClick: ee
                }) : h("div", {
                    children: h(q9, {
                        tab: u,
                        state: a,
                        dispatch: n
                    })
                }), h("div", {
                    className: "mt-5 flex gap-1 overflow-x-auto border-b border-apex-line pb-px lg:hidden",
                    children: By.map(re => {
                        const te = re.icon,
                            T = u === re.id;
                        return h("button", {
                            type: "button",
                            onClick: () => c(re.id),
                            className: ce("relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] transition-colors", T ? "text-white" : "text-white/45 hover:text-white"),
                            children: [h(te, {
                                className: ce("size-3.5", T ? "text-apex-red" : "text-white/40")
                            }), re.label, T && h("span", {
                                className: "absolute inset-x-2 -bottom-px h-0.5 bg-apex-red"
                            })]
                        }, re.id)
                    })
                })]
            })]
        })]
    })
}

function J9({
    state: a,
    active: n,
    rarityMeta: i,
    condition: o,
    perClick: u,
    income: c,
    popups: h,
    onCarClick: m
}) {
    return h("div", {
        className: "relative",
        children: [h("div", {
            className: "mb-4 flex items-center justify-between",
            children: h("p", {
                className: "font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red",
                children: "Earn"
            })
        }), h("div", {
            onClick: m,
            className: "group relative cursor-pointer select-none overflow-hidden rounded-2xl border border-apex-line bg-[#0b0b0c]",
            children: [h("span", {
                className: "pointer-events-none absolute left-3 top-3 z-10 size-4 border-l-2 border-t-2 border-apex-red/50"
            }), h("span", {
                className: "pointer-events-none absolute right-3 top-3 z-10 size-4 border-r-2 border-t-2 border-apex-red/50"
            }), h("span", {
                className: "pointer-events-none absolute bottom-3 left-3 z-10 size-4 border-b-2 border-l-2 border-apex-red/50"
            }), h("span", {
                className: "pointer-events-none absolute bottom-3 right-3 z-10 size-4 border-b-2 border-r-2 border-apex-red/50"
            }), h("div", {
                className: "pointer-events-none absolute inset-0",
                style: {
                    background: `radial-gradient(80% 90% at 50% 40%, ${i.glow} 0%, transparent 60%), #050505`
                }
            }), h("div", {
                className: "relative flex min-h-[560px] flex-col items-center justify-center p-6 sm:min-h-[680px]",
                children: [h("div", {
                    className: "mb-3 flex items-center gap-2",
                    children: [h("span", {
                        className: "rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                        style: {
                            borderColor: i.color,
                            color: i.color,
                            background: `${i.color}14`
                        },
                        children: i.label
                    }), h("span", {
                        className: "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40",
                        children: [n.brand, " · ", n.year]
                    })]
                }), h("h2", {
                    className: "font-display text-4xl font-black tracking-tight text-white sm:text-6xl",
                    children: n.name
                }), h(Ge.div, {
                    whileTap: {
                        scale: .97
                    },
                    className: "relative mt-6 w-full max-w-5xl",
                    children: [h(Ha, {
                        src: es(n),
                        alt: n.name,
                        className: "mx-auto w-full max-h-[520px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                    }), h("div", {
                        className: "pointer-events-none absolute inset-x-10 bottom-2 h-8 rounded-[100%] opacity-60 blur-xl",
                        style: {
                            background: i.glow
                        }
                    })]
                }), h("div", {
                    className: "mt-7 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-apex-line bg-apex-line sm:grid-cols-4",
                    children: [h(sc, {
                        value: Ie(u),
                        label: "Per click",
                        accent: !0
                    }), h(sc, {
                        value: Ie(c),
                        label: "Per second"
                    }), h(sc, {
                        value: Ie(Ur(a, a.activeCarId)),
                        label: "Value"
                    }), h(sc, {
                        value: T1(a, a.activeCarId).toLocaleString(),
                        label: "Power"
                    })]
                }), h("div", {
                    className: "mt-5 w-full max-w-md",
                    children: [h("div", {
                        className: "mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35",
                        children: [h("span", {
                            children: "Condition"
                        }), h("span", {
                            children: [Math.round(o * 100), "%"]
                        })]
                    }), h("div", {
                        className: "h-1.5 w-full overflow-hidden rounded-full bg-white/10",
                        children: h(Ge.div, {
                            className: "h-full rounded-full bg-apex-red",
                            animate: {
                                width: `${o*100}%`
                            },
                            transition: {
                                duration: .4
                            }
                        })
                    })]
                }), h("p", {
                    className: "mt-7 inline-flex items-center gap-2 rounded-full border border-apex-red/40 bg-apex-red/10 px-6 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors group-hover:bg-apex-red",
                    children: [h(Ky, {
                        className: "size-4"
                    }), "Click the car to earn"]
                })]
            }), h("div", {
                className: "pointer-events-none absolute inset-0 overflow-hidden",
                children: h(ts, {
                    children: h.map(f => h(Ge.span, {
                        initial: {
                            opacity: 1,
                            y: 0,
                            scale: .8
                        },
                        animate: {
                            opacity: 0,
                            y: -70,
                            scale: 1.15
                        },
                        exit: {
                            opacity: 0
                        },
                        transition: {
                            duration: .85,
                            ease: "easeOut"
                        },
                        className: ce("absolute font-display text-xl font-black", f.crit ? "text-amber-300" : "text-apex-red"),
                        style: {
                            left: f.x,
                            top: f.y,
                            textShadow: "0 2px 12px rgba(0,0,0,0.8)"
                        },
                        children: f.text
                    }, f.id))
                })
            })]
        })]
    })
}

function sc({
    value: a,
    label: n,
    accent: i
}) {
    return h("div", {
        className: "bg-apex-panel px-3 py-4 text-center",
        children: [h("p", {
            className: ce("font-display text-2xl font-black", i ? "text-apex-red" : "text-white"),
            children: a
        }), h("p", {
            className: "mt-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35",
            children: n
        })]
    })
}

function ro({
    icon: a,
    label: n,
    value: i,
    accent: o
}) {
    return h("div", {
        className: "flex items-center gap-2 rounded-md border border-apex-line bg-apex-panel px-3 py-1.5",
        children: [h(a, {
            className: ce("size-3.5", o ? "text-apex-red" : "text-white/40")
        }), h("span", {
            className: "font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40",
            children: n
        }), h("span", {
            className: "font-display text-sm font-black text-white",
            children: i
        })]
    })
}
const Z9 = 5e3;

function e8() {
    const a = wt(_e.adminAbuse.getActiveEvent),
        n = wt(_e.adminAbuse.getMyGifts),
        i = Fe(_e.adminAbuse.claimGift),
        [o, u] = C.useReducer(w9, void 0, _9),
        c = React.useRef(o),
        [h, m] = React.useState(!1),
        f = h ? null : a,
        g = f?.multiplier ?? 1,
        x = React.useRef(g);
    React.useEffect(() => {
        a && m(!1)
    }, [a]), React.useEffect(() => {
        if (!a) return;
        const v = a.expiresAt - Date.now();
        if (v <= 0) {
            m(!0);
            return
        }
        const w = setTimeout(() => m(!0), v + 500);
        return () => clearTimeout(w)
    }, [a]), React.useEffect(() => {
        c.current = o
    }, [o]), React.useEffect(() => {
        x.current = g
    }, [g]);
    const y = React.useRef(new Set);
    return React.useEffect(() => {
        if (!(!n || n.length === 0))
            for (const v of n) y.current.has(v._id) || (y.current.add(v._id), v.kind === "money" && v.amount ? (u({
                type: "ADD_CASH",
                amount: v.amount
            }), ye.success(`💰 Admin Gift: +$${v.amount.toLocaleString()} added to your balance!`, {
                duration: 8e3,
                style: {
                    background: "#1a0a04",
                    border: "1px solid rgba(255,46,0,0.4)",
                    color: "#fff"
                }
            })) : v.kind === "car" && v.carId && (u({
                type: "ADD_CAR",
                carId: v.carId
            }), ye.success("🏎️ Admin Gift: A new car was added to your garage!", {
                duration: 8e3,
                style: {
                    background: "#1a0a04",
                    border: "1px solid rgba(255,46,0,0.4)",
                    color: "#fff"
                }
            })), i({
                giftId: v._id
            }))
    }, [n, i]), React.useEffect(() => {
        const v = window.setInterval(() => {
                c.current && ic(c.current)
            }, Z9),
            w = () => {
                document.visibilityState === "hidden" && c.current && ic(c.current)
            },
            S = () => {
                c.current && ic(c.current)
            };
        return document.addEventListener("visibilitychange", w), window.addEventListener("pagehide", S), () => {
            window.clearInterval(v), document.removeEventListener("visibilitychange", w), window.removeEventListener("pagehide", S), c.current && ic(c.current)
        }
    }, []), React.useEffect(() => {
        const v = window.setInterval(() => {
            u({
                type: "TICK",
                now: Date.now(),
                globalMultiplier: x.current
            })
        }, 1e3);
        return () => window.clearInterval(v)
    }, []), h(X9, {
        state: o,
        dispatch: u,
        globalMultiplier: g,
        activeEvent: f
    })
}

function t8() {
    return h("div", {
        className: "flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center",
        children: [h("p", {
            className: "font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red",
            children: "Dead end"
        }), h("h1", {
            className: "mt-4 font-display text-8xl font-black tracking-tight text-white",
            children: "404"
        }), h("p", {
            className: "mt-3 text-sm text-apex-muted",
            children: "This road doesn't lead anywhere."
        }), h(ze, {
            to: "/garage",
            className: "group mt-8 inline-flex items-center gap-2 rounded-md bg-apex-red px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright",
            children: ["Back to the garage", h(Qa, {
                className: "size-4 transition-transform group-hover:translate-x-1"
            })]
        })]
    })
}
const a8 = new IC("https://mellow-clownfish-810.convex.cloud");

function n8() {
    const a = jo();
    return React.useEffect(() => {
        window.parent.postMessage({
            type: "iframe-route-change",
            path: a.pathname
        }, "*")
    }, [a.pathname]), React.useEffect(() => {
        function n(i) {
            i.data?.type === "navigate" && (i.data.direction === "back" && window.history.back(), i.data.direction === "forward" && window.history.forward())
        }
        return window.addEventListener("message", n), () => window.removeEventListener("message", n)
    }, []), null
}

function r8() {
    const a = jo();
    return React.useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "instant"
        })
    }, [a.pathname]), null
}
F6.createRoot(document.getElementById("root")).render(h(C.StrictMode, {
    children: [h(x4, {}), h(_j, {
        children: h(_6, {
            client: a8,
            children: [h(l6, {
                children: h(wv, {
                    children: [h(n8, {}), h(r8, {}), h(_v, {
                        children: [h(Jt, {
                            element: h(q6, {}),
                            children: [h(Jt, {
                                path: "/",
                                element: h(cN, {})
                            }), h(Jt, {
                                path: "/garage",
                                element: h(TN, {})
                            }), h(Jt, {
                                path: "/game",
                                element: h(e8, {})
                            }), h(Jt, {
                                path: "/cars/:slug",
                                element: h(EN, {})
                            }), h(Jt, {
                                path: "/brands/:slug",
                                element: h(RN, {})
                            }), h(Jt, {
                                path: "/rankings",
                                element: h(LN, {})
                            }), h(Jt, {
                                path: "/favorites",
                                element: h(DN, {})
                            }), h(Jt, {
                                path: "/my-garage",
                                element: h(dh, {
                                    children: h(pN, {})
                                })
                            }), h(Jt, {
                                path: "/profile",
                                element: h(dh, {
                                    children: h(fN, {})
                                })
                            }), h(Jt, {
                                path: "/compare",
                                element: h(BN, {})
                            }), h(Jt, {
                                path: "/feedback",
                                element: h(dh, {
                                    children: h(hN, {})
                                })
                            }), h(Jt, {
                                path: "/admin",
                                element: h(I6, {
                                    children: h(CN, {})
                                })
                            }), h(Jt, {
                                path: "*",
                                element: h(t8, {})
                            })]
                        }), h(Jt, {
                            path: "/auth",
                            element: h(n9, {
                                redirectAfterAuth: "/favorites"
                            })
                        })]
                    })]
                })
            }), h(y5, {})]
        })
    })]
}));

/* ─── GamePanels router ─── */
export function GamePanels({ tab, state, dispatch }: { tab: string; state: GameState; dispatch: React.Dispatch<any> }) {
  switch (tab) {
    case "spin": return <SpinPanel state={state} dispatch={dispatch} />;
    case "dealer": return <DealerPanel state={state} dispatch={dispatch} />;
    case "crates": return <CratePanel state={state} dispatch={dispatch} />;
    case "upgrades": return <UpgradePanel state={state} dispatch={dispatch} />;
    case "inventory": return <PartsBin state={state} dispatch={dispatch} />;
    case "achievements": return <AchievementsPanel state={state} />;
    case "prestige": return <PrestigePanel state={state} dispatch={dispatch} />;
    default: return <GaragePanel state={state} dispatch={dispatch} />;
  }
}
