/**
 * OnlineCoinflip — REAL 1v1 coinflip matchmaking on Convex.
 *
 * Flow: creator posts an open match (bet + pick) → any signed-in player
 * joins the opposite side → the coin is decided SERVER-SIDE at join time
 * and SEALED ("live") → both clients see "MATCH FOUND" on the same
 * subscription clock, toss the same 3D coin, then pull the sealed result
 * together via finalize(). Neither client learns the flip early, and both
 * players watch the same authoritative coin land.
 *
 * Money: creator stakes at create, joiner stakes at join, winner takes 2×.
 * Creator payout/refund is exactly-once via the server `creatorSettled`
 * flag; the joiner settles once from finalize()'s return.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, CircleDot, Swords, Star, Users, Radio, Volume2, VolumeX, Trophy } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { GameState } from "@/game/types";
import type { Action } from "@/game/engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CoinflipOpenRow = FunctionReturnType<typeof api.coinflip.listOpen>[number];
type CoinflipMyRow = FunctionReturnType<typeof api.coinflip.listMyRecent>[number];
type FlipFeedRow = FunctionReturnType<typeof api.coinflip.recentFlips>[number];
type Side = "heads" | "tails";

/* ── Sound engine: synthesized WebAudio, zero assets ─────────────────────
   Lazily created AudioContext on first user interaction. Muted state is
   persisted so a player's choice survives reloads. */
let audioCtx: AudioContext | null = null;
let muted = localStorage.getItem("coinflip-muted") === "1";

/** Is sound currently muted? (shared with the offline coinflip UI) */
export function isMuted() {
  return muted;
}

/** Flip the shared mute state. Returns the new value. */
export function toggleMuted() {
  muted = !muted;
  localStorage.setItem("coinflip-muted", muted ? "1" : "0");
  return muted;
}

function setMuted(next: boolean) {
  muted = next;
  localStorage.setItem("coinflip-muted", next ? "1" : "0");
}
void setMuted; // reserved for programmatic muting (e.g. future settings menu)

export interface Sfx {
  matchFound(): void;
  whoosh(): void;
  land(): void;
  win(): void;
  lose(): void;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  const ctx = ac();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export const sfx: Sfx = {
  // Online matches get a match-found chime; the offline flip never calls it.
  matchFound() {
    tone(660, 0, 0.14, "square", 0.06);
    tone(880, 0.12, 0.2, "square", 0.06);
  },
  whoosh() {
    const ctx = ac();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  },
  land() {
    tone(180, 0, 0.1, "triangle", 0.18);
    tone(120, 0.02, 0.14, "sine", 0.14);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.1));
  },
  lose() {
    tone(330, 0, 0.25, "sawtooth", 0.05);
    tone(247, 0.14, 0.3, "sawtooth", 0.05);
  },
};

/* ── Shared casino chrome ───────────────────────────────────────────────── */
function CoinIcon({ side, size = "md" }: { side: Side | "unknown"; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-8 text-[11px]", md: "size-12 text-sm", lg: "size-16 text-lg" };
  return (
    <div className={cn("rounded-full border-2 flex items-center justify-center font-display font-black transition-all duration-300", sizes[size],
      side === "heads" ? "border-amber-500 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-900 shadow-lg shadow-amber-500/30"
        : side === "tails" ? "border-gray-400 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 shadow-lg shadow-gray-400/30"
        : "border-white/30 bg-white/10 text-white/50"
    )}>
      {side === "heads" ? "H" : side === "tails" ? "T" : "?"}
    </div>
  );
}

function BetInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const presets = [1000, 10000, 100000, 1000000, 10000000];
  return (
    <div className="w-full space-y-3">
      <input type="number" value={value} max={max}
        onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
        onBlur={() => onChange(Math.max(1, Math.min(max, value)))}
        className="min-w-0 w-full rounded-xl border-2 border-white/15 bg-[#0a0a0c] px-5 py-3.5 text-xl font-bold text-white text-center outline-none focus:border-apex-red transition-colors" />
      <p className="text-right text-xs font-bold text-white/30">Max: ${max.toLocaleString()}</p>
      <div className="flex flex-wrap gap-2">
        {presets.filter((p) => p <= max).slice(0, 5).map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className={cn("rounded-lg px-4 py-2 text-sm font-bold transition-colors cursor-pointer",
              value === p ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
            {p >= 1000000 ? `${(p / 1000000).toFixed(0)}M` : p >= 1000 ? `${(p / 1000).toFixed(0)}K` : p}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shared timeline constants — every phase keyed off the server's flip time. */
const MATCH_FOUND_MS = 1800; // "VS" beat before the toss starts
const TOSS_MS = 2600;        // must match the CSS toss animation duration
const OPEN_TTL_MS = 5 * 60_000;

type Phase =
  | { kind: "found"; opponent: string; bet: number; until: number }
  | { kind: "tossing"; tossKey: number; winnerSide: Side | null }
  | { kind: "reveal"; myPick: Side; oppPick: Side; winnerSide: Side; won: boolean; opponent: string; payout: number };

export function OnlineCoinflip({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const { isAuthenticated } = useAuth();
  const openMatches = useQuery(api.coinflip.listOpen, isAuthenticated ? {} : "skip");
  const myRecent = useQuery(api.coinflip.listMyRecent, isAuthenticated ? {} : "skip");
  const feed = useQuery(api.coinflip.recentFlips, isAuthenticated ? {} : "skip");
  const stats = useQuery(api.coinflip.myStats, isAuthenticated ? {} : "skip");
  const online = useQuery(api.presence.onlineCount, isAuthenticated ? {} : "skip");
  const createMatch = useMutation(api.coinflip.create);
  const cancelMatch = useMutation(api.coinflip.cancel);
  const joinMatch = useMutation(api.coinflip.join);
  const finalizeMatch = useMutation(api.coinflip.finalize);
  const settleCreator = useMutation(api.coinflip.settleCreator);

  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<Side>("heads");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [flipHistory, setFlipHistory] = useState<{ side: Side; won: boolean }[]>([]);
  const [isMuted, setIsMutedState] = useState(muted);
  const [now, setNow] = useState(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tossedIds = useRef(new Set<string>()); // matches already animated this session
  const settledIds = useRef(new Set<string>()); // finalize payouts taken this session

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);
  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const toggleMute = () => {
    setMuted(!isMuted);
    setIsMutedState(!isMuted);
  };

  const finalizeAttempts = useRef(0);
  /** Shared reveal: pull the sealed coin, show it, pay the joiner. */
  const revealMatch = useCallback((matchId: string, iAmJoiner: boolean) => {
    finalizeMatch({ matchId: matchId as never })
      .then((r) => {
        finalizeAttempts.current = 0;
        sfx.land();
        setPhase({
          kind: "reveal",
          myPick: r.creatorPick as Side,
          oppPick: r.opponentPick as Side,
          winnerSide: r.flip as Side,
          won: r.youWon,
          opponent: iAmJoiner ? r.creatorName : r.opponentName,
          payout: r.youWon ? r.winnerPayout : 0,
        });
        setFlipHistory((h) => [{ side: r.flip as Side, won: r.youWon }, ...h].slice(0, 12));
        if (r.youWon) {
          sfx.win();
          if (iAmJoiner && !settledIds.current.has(matchId)) {
            settledIds.current.add(matchId);
            dispatch({ type: "ADD_CASH", amount: r.winnerPayout });
          }
          toast.success(`You won $${r.winnerPayout.toLocaleString()}!`);
        } else {
          sfx.lose();
          toast.error(`${iAmJoiner ? r.creatorName : r.opponentName} won the flip.`);
        }
      })
      .catch(() => {
        // Bounded retry — the row may not be finalizable yet (the 900ms
        // seal window) or the network hiccuped. Never tight-loop forever.
        if (finalizeAttempts.current >= 5) {
          toast.error("Couldn't load the flip result — try reopening the casino.");
          setPhase(null);
          return;
        }
        finalizeAttempts.current += 1;
        addTimer(() => revealMatch(matchId, iAmJoiner), 1500);
      });
  }, [finalizeMatch, dispatch, addTimer]);

  // Drive the whole match lifecycle off the shared `listMyRecent` subscription.
  useEffect(() => {
    if (!myRecent) return;
    for (const m of myRecent) {
      if (m.status === "live" && !tossedIds.current.has(m._id)) {
        tossedIds.current.add(m._id);
        clearTimers();
        const iAmCreator = m.iAmCreator;
        // Both clients get the same "match found" beat (the subscription
        // delivers the live row at join time), then toss, then reveal.
        sfx.matchFound();
        setPhase({ kind: "found", opponent: m.opponentName || "Challenger", bet: m.bet, until: Date.now() + MATCH_FOUND_MS });
        addTimer(() => {
          sfx.whoosh();
          setPhase({ kind: "tossing", tossKey: Date.now(), winnerSide: null });
          addTimer(() => revealMatch(m._id, !iAmCreator), TOSS_MS);
        }, MATCH_FOUND_MS);
      }
      // Creator money settlement — exactly-once via the server flag.
      if ((m.status === "done" || m.status === "cancelled") && m.iAmCreator && !settledIds.current.has(`c-${m._id}`)) {
        settledIds.current.add(`c-${m._id}`);
        settleCreator({ matchId: m._id })
          .then((r) => {
            if (r.already || r.pending) return;
            if (r.refunded) {
              dispatch({ type: "ADD_CASH", amount: r.payout });
              toast.info(`No opponent showed up — $${r.payout.toLocaleString()} refunded.`);
            } else if (r.won) {
              dispatch({ type: "ADD_CASH", amount: r.payout });
            }
          })
          .catch(() => {
            const id = `c-${m._id}`;
            window.setTimeout(() => settledIds.current.delete(id), 3_000);
          });
      }
    }
  }, [myRecent, settleCreator, dispatch, revealMatch, addTimer, clearTimers]);

  const myOpenMatch: CoinflipMyRow | undefined = myRecent?.find((m) => m.status === "open" && m.iAmCreator);
  const liveRow: CoinflipMyRow | undefined = myRecent?.find((m) => m.status === "live");
  const lobby: CoinflipOpenRow[] = (openMatches ?? []).filter((m) => !m.mine);
  const inMatch = Boolean(myOpenMatch || liveRow || phase);

  const postMatch = useCallback(async () => {
    if (state.cash < bet) { toast.error("Not enough cash!"); return; }
    setBusy(true);
    try {
      await createMatch({ bet, pick });
      dispatch({ type: "ADD_CASH", amount: -bet });
      toast.info("Match posted — waiting for a challenger…");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post match.");
    } finally { setBusy(false); }
  }, [bet, pick, state.cash, createMatch, dispatch]);

  const joinFn = useCallback(async (m: CoinflipOpenRow) => {
    if (state.cash < m.bet) { toast.error("Not enough cash!"); return; }
    setBusy(true);
    try {
      const r = await joinMatch({ matchId: m._id });
      void r;
      dispatch({ type: "ADD_CASH", amount: -m.bet }); // stake held during the toss
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Match already taken.");
    } finally { setBusy(false); }
  }, [state.cash, joinMatch, dispatch]);

  const winRate = stats && stats.flips > 0 ? Math.round((stats.wins / stats.flips) * 100) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 sm:p-8 lg:p-10">
      <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/5 sm:size-14">
            <Swords className="size-7 text-blue-400" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-black text-white sm:text-3xl">Online Coinflip 1v1</h3>
            <p className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
              {online ?? "—"} player{(online ?? 0) === 1 ? "" : "s"} online · real-time PvP
            </p>
          </div>
        </div>
        <button type="button" onClick={toggleMute} title={isMuted ? "Unmute sounds" : "Mute sounds"}
          className="cursor-pointer rounded-lg border border-white/10 p-2 text-white/50 transition-colors hover:border-white/25 hover:text-white">
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-6">
        {!isAuthenticated && (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center">
            <p className="text-sm text-white/60">Sign in to flip against real players — the coin is decided server-side and revealed to both players at the same instant.</p>
          </div>
        )}

        {/* ── Phase: MATCH FOUND ─────────────────────────────────────── */}
        {isAuthenticated && phase?.kind === "found" && (
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 px-6 py-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-blue-300 animate-pulse">Match found</p>
            <div className="flex items-center gap-4">
              <span className="font-display text-2xl font-black text-white">YOU</span>
              <span className="font-display text-3xl font-black text-apex-red">VS</span>
              <span className="font-display text-2xl font-black text-white">{phase.opponent}</span>
            </div>
            <p className="text-sm text-white/50">Stakes locked: <span className="font-bold text-white">${phase.bet.toLocaleString()}</span> each</p>
          </motion.div>
        )}

        {/* ── Phase: TOSSING (the 3D coin) ───────────────────────────── */}
        {isAuthenticated && phase?.kind === "tossing" && (
          <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-8">
            <div className="toss-stage">
              <div key={phase.tossKey} className="toss-coin-wrap">
                <div className="toss-coin" style={{ "--spin-turns": `${Math.min(tossedIds.current.size, 4) * 1800 + 720}deg` } as React.CSSProperties}>
                  <div className="coin-face coin-heads"><Crown className="size-12 text-amber-900 drop-shadow-lg" /><div className="coin-sheen" /></div>
                  <div className="coin-face coin-tails"><Star className="size-12 text-gray-800 drop-shadow-lg" /><div className="coin-sheen" /></div>
                  <div className="coin-edge" />
                </div>
              </div>
            </div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/40 animate-pulse">The coin is in the air…</p>
          </div>
        )}

        {/* ── Phase: REVEAL ──────────────────────────────────────────── */}
        {isAuthenticated && phase?.kind === "reveal" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={cn("flex w-full flex-col items-center gap-4 rounded-xl border px-6 py-6",
              phase.won ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]")}>
            <p className={cn("font-display text-xl font-black uppercase tracking-wider", phase.won ? "text-emerald-400" : "text-apex-red")}>
              {phase.won ? `Victory — +$${phase.payout.toLocaleString()}` : "Defeat"}
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="mb-1 text-xs text-white/30">You</p><CoinIcon side={phase.myPick} size="lg" /></div>
              <div className="text-center">
                <p className="mb-1 text-xs uppercase text-white/40">Coin</p>
                <p className={cn("font-display text-3xl font-black", phase.winnerSide === "heads" ? "text-amber-300" : "text-white/80")}>
                  {phase.winnerSide === "heads" ? "H" : "T"}
                </p>
              </div>
              <div className="text-center"><p className="mb-1 text-xs text-white/30">{phase.opponent || "Opponent"}</p><CoinIcon side={phase.oppPick} size="lg" /></div>
            </div>
            <button type="button" onClick={() => setPhase(null)}
              className="mt-1 cursor-pointer rounded-lg border border-white/15 px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:border-apex-red/50 hover:text-white">
              Done
            </button>
          </motion.div>
        )}

        {/* ── Waiting room ───────────────────────────────────────────── */}
        {isAuthenticated && myOpenMatch && !phase && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 px-6 py-5">
            <CircleDot className="size-6 animate-pulse text-blue-400" />
            <p className="font-display text-sm font-bold uppercase tracking-wider text-white">Waiting for an opponent…</p>
            <p className="text-xs text-white/50">You posted <span className="font-bold text-white">${myOpenMatch.bet.toLocaleString()}</span> on <span className="font-bold uppercase text-white">{myOpenMatch.myPick}</span></p>
            <button type="button" onClick={() => cancelMatch({ matchId: myOpenMatch._id }).catch(() => toast.error("Could not cancel."))}
              className="cursor-pointer rounded-lg border border-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:border-apex-red/50 hover:text-white">
              Cancel match
            </button>
          </motion.div>
        )}

        {/* ── My stats ───────────────────────────────────────────────── */}
        {isAuthenticated && stats && stats.flips > 0 && !phase && (
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Flips", value: stats.flips.toLocaleString() },
              { label: "Win rate", value: `${winRate}%` },
              { label: "Wagered", value: `$${stats.wagered >= 1_000_000 ? `${(stats.wagered / 1_000_000).toFixed(1)}M` : stats.wagered.toLocaleString()}` },
              { label: "Net", value: `${stats.netWon >= 0 ? "+" : "-"}$${Math.abs(stats.netWon) >= 1_000_000 ? `${(Math.abs(stats.netWon) / 1_000_000).toFixed(1)}M` : Math.abs(stats.netWon).toLocaleString()}`, positive: stats.netWon >= 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">{s.label}</p>
                <p className={cn("font-display text-sm font-black", s.positive === undefined ? "text-white" : s.positive ? "text-emerald-400" : "text-apex-red")}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Personal flip history ──────────────────────────────────── */}
        {flipHistory.length > 0 && !phase && (
          <div className="w-full">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Your flips</p>
            <div className="chat-scroll flex gap-1.5 overflow-x-auto pb-1">
              {flipHistory.map((f, i) => (
                <span key={`${i}-${f.side}-${f.won}`}
                  className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold",
                    f.won ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
                  {f.side === "heads" ? "H" : "T"} {f.won ? "✓" : "✗"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Post a match ───────────────────────────────────────────── */}
        {isAuthenticated && !myOpenMatch && !phase && (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <div className="flex gap-3">
              {(["heads", "tails"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setPick(s)}
                  className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
                    pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50 hover:border-white/30")}>
                  {s === "heads" ? <Crown className="size-5" /> : <Star className="size-5" />}{s}
                </button>
              ))}
            </div>
            <div className="w-full"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
            <button type="button" onClick={postMatch} disabled={busy || state.cash < bet}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-40">
              {busy ? <CircleDot className="size-4 animate-spin" /> : <Swords className="size-4" />}
              Post Match — ${bet.toLocaleString()}
            </button>
            <p className="text-center text-xs text-white/30">Your bet is held while you wait. Winner takes both stakes (2×). Cancel anytime — unmatched matches auto-refund after 5 minutes.</p>
          </div>
        )}

        {/* ── Global flip feed ───────────────────────────────────────── */}
        {isAuthenticated && feed && feed.length > 0 && (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-white/40">
              <Radio className="size-3.5 text-apex-red" /> Live flip feed
            </p>
            <div className="flex flex-col gap-1.5">
              {feed.slice(0, 6).map((f: FlipFeedRow) => (
                <div key={f._id} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="font-bold text-emerald-400">{f.winnerName}</span>
                    <span className="text-white/40"> beat </span>
                    <span className="font-bold text-white/70">{f.loserName}</span>
                  </span>
                  <span className="shrink-0 font-mono text-white/40">
                    {f.winnerSide === "heads" ? "H" : "T"} · ${(f.bet >= 1_000_000 ? `${(f.bet / 1_000_000).toFixed(1)}M` : f.bet.toLocaleString())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lobby ──────────────────────────────────────────────────── */}
        {!inMatch && (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-white/40">
              <Users className="size-3.5 text-blue-400" />
              Open matches{openMatches ? ` (${lobby.length})` : ""}
            </p>
            {!openMatches ? (
              <p className="py-3 text-center text-xs text-white/30">Loading lobby…</p>
            ) : lobby.length === 0 ? (
              <p className="py-3 text-center text-xs text-white/30">No open matches right now — post one and a challenger will see it live.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lobby.map((m) => (
                  <div key={m._id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{m.creatorName}</p>
                      <p className="text-xs text-white/40">picked <span className="font-bold uppercase text-white/70">{m.creatorPick}</span> · ${m.bet.toLocaleString()} · expires in {Math.max(0, Math.ceil((m.createdAt + OPEN_TTL_MS - now) / 60_000))}m</p>
                    </div>
                    <button type="button" disabled={busy || state.cash < m.bet} onClick={() => joinFn(m)}
                      className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-blue-700 disabled:opacity-40">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
