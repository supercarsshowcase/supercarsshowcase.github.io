/**
 * OnlineCoinflip — REAL 1v1 coinflip matchmaking on Convex.
 *
 * A creator posts an open match (bet + pick); any signed-in player sees it
 * live and joins the opposite side. The coin is flipped SERVER-SIDE at join
 * time, so both clients watch the same authoritative result arrive through
 * their subscriptions. Money: creator stakes at create, joiner stakes at
 * join, winner takes 2×. Creator settlement (payout/refund) is exactly-once
 * via the server's `creatorSettled` flag; the joiner settles from join().
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, CircleDot, Swords } from "lucide-react";
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
type Side = "heads" | "tails";

/* ── Shared casino chrome (kept local to avoid a circular import) ──────── */
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
      <div className="flex items-center gap-3">
        <input type="number" value={value} max={max}
          onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
          onBlur={() => onChange(Math.max(1, Math.min(max, value)))}
          className="min-w-0 flex-1 rounded-xl border-2 border-white/15 bg-[#0a0a0c] px-5 py-3.5 text-xl font-bold text-white text-center outline-none focus:border-apex-red transition-colors" />
      </div>
      <p className="text-right text-xs font-bold text-white/30">Max: ${max.toLocaleString()}</p>
      <div className="flex flex-wrap gap-2">
        {presets.filter((p) => p <= max).slice(0, 5).map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className={cn("rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              value === p ? "bg-apex-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
            {p >= 1000000 ? `${(p / 1000000).toFixed(0)}M` : p >= 1000 ? `${(p / 1000).toFixed(0)}K` : p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OnlineCoinflip({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const { isAuthenticated } = useAuth();
  const openMatches = useQuery(api.coinflip.listOpen, isAuthenticated ? {} : "skip");
  const myRecent = useQuery(api.coinflip.listMyRecent, isAuthenticated ? {} : "skip");
  const createMatch = useMutation(api.coinflip.create);
  const cancelMatch = useMutation(api.coinflip.cancel);
  const joinMatch = useMutation(api.coinflip.join);
  const settleCreator = useMutation(api.coinflip.settleCreator);

  const [bet, setBet] = useState(10000);
  const [pick, setPick] = useState<Side>("heads");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ myPick: Side; oppPick: Side; winnerSide: Side; won: boolean; opponent: string; payout: number } | null>(null);

  // Creator-side payout/refund — exactly-once via the server flag. The
  // joiner settles from the join() mutation's return value instead.
  const settledIds = useRef(new Set<string>());
  useEffect(() => {
    if (!myRecent) return;
    for (const m of myRecent) {
      if (m.status === "open" || !m.iAmCreator || settledIds.current.has(m._id)) continue;
      settledIds.current.add(m._id);
      settleCreator({ matchId: m._id })
        .then((r) => {
          if (r.already || r.pending) return;
          if (r.refunded) {
            dispatch({ type: "ADD_CASH", amount: r.payout });
            toast.info(`No opponent showed up — $${r.payout.toLocaleString()} refunded.`);
          } else {
            if (r.won) dispatch({ type: "ADD_CASH", amount: r.payout });
            setReveal({
              myPick: m.myPick as Side,
              oppPick: m.myPick === "heads" ? "tails" : "heads",
              winnerSide: m.winnerSide as Side,
              won: r.won === true,
              opponent: m.opponentName,
              payout: r.payout,
            });
            if (r.won) toast.success(`You beat ${m.opponentName}! +$${r.payout.toLocaleString()}`);
            else toast.error(`${m.opponentName} won the flip.`);
          }
        })
        .catch(() => {
          // Network hiccup — allow a retry, but NOT synchronously: the query
          // subscription re-fires immediately on reconnect, and an instant
          // delete here would tight-loop failing settle calls.
          const id = m._id;
          window.setTimeout(() => settledIds.current.delete(id), 3_000);
        });
    }
  }, [myRecent, settleCreator, dispatch]);

  const myOpenMatch: CoinflipMyRow | undefined = myRecent?.find((m) => m.status === "open" && m.iAmCreator);
  const lobby: CoinflipOpenRow[] = (openMatches ?? []).filter((m) => !m.mine);

  const postMatch = useCallback(async () => {
    if (state.cash < bet) { toast.error("Not enough cash!"); return; }
    setBusy(true); setReveal(null);
    try {
      await createMatch({ bet, pick });
      dispatch({ type: "ADD_CASH", amount: -bet }); // stake held while open
      toast.info("Match posted — waiting for a challenger...");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post match.");
    } finally { setBusy(false); }
  }, [bet, pick, state.cash, createMatch, dispatch]);

  const joinFn = useCallback(async (m: CoinflipOpenRow) => {
    if (state.cash < m.bet) { toast.error("Not enough cash!"); return; }
    setBusy(true); setReveal(null);
    try {
      const r = await joinMatch({ matchId: m._id });
      const myPick: Side = m.creatorPick === "heads" ? "tails" : "heads";
      dispatch({ type: "ADD_CASH", amount: -m.bet }); // stake
      if (r.youWon) dispatch({ type: "ADD_CASH", amount: r.winnerPayout });
      setReveal({ myPick, oppPick: m.creatorPick as Side, winnerSide: r.flip as Side, won: r.youWon, opponent: r.creatorName, payout: r.youWon ? r.winnerPayout : 0 });
      if (r.youWon) toast.success(`You beat ${r.creatorName}! +$${r.winnerPayout.toLocaleString()}`);
      else toast.error(`${r.creatorName} won the flip.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Match already taken.");
    } finally { setBusy(false); }
  }, [state.cash, joinMatch, dispatch]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 sm:p-8 lg:p-10">
      <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-white/5 sm:size-14">
          <Swords className="size-7 text-blue-400" />
        </div>
        <h3 className="font-display text-2xl font-black text-white sm:text-3xl">Online Coinflip 1v1</h3>
      </div>

      <div className="flex flex-col items-center gap-6">
        {!isAuthenticated && (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center">
            <p className="text-sm text-white/60">Sign in to flip against real players — the coin is flipped server-side, no trusting anyone's RNG.</p>
          </div>
        )}

        {isAuthenticated && myOpenMatch && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full flex-col items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 px-6 py-5">
            <CircleDot className="size-6 animate-pulse text-blue-400" />
            <p className="font-display text-sm font-bold uppercase tracking-wider text-white">Waiting for an opponent…</p>
            <p className="text-xs text-white/50">You posted <span className="font-bold text-white">${myOpenMatch.bet.toLocaleString()}</span> on <span className="font-bold uppercase text-white">{myOpenMatch.myPick}</span></p>
            <button type="button" onClick={() => cancelMatch({ matchId: myOpenMatch._id }).catch(() => toast.error("Could not cancel."))}
              className="rounded-lg border border-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:border-apex-red/50 hover:text-white">
              Cancel match
            </button>
          </motion.div>
        )}

        {reveal && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full flex-col items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <p className={cn("font-display text-xl font-black uppercase tracking-wider", reveal.won ? "text-emerald-400" : "text-apex-red")}>
              {reveal.won ? `Victory — +$${reveal.payout.toLocaleString()}` : "Defeat"}
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="mb-1 text-xs text-white/30">You</p><CoinIcon side={reveal.myPick} size="lg" /></div>
              <div className="text-center">
                <p className="mb-1 text-xs uppercase text-white/40">Coin</p>
                <p className={cn("font-display text-3xl font-black", reveal.winnerSide === "heads" ? "text-amber-300" : "text-white/80")}>{reveal.winnerSide === "heads" ? "H" : "T"}</p>
              </div>
              <div className="text-center"><p className="mb-1 text-xs text-white/30">{reveal.opponent || "Opponent"}</p><CoinIcon side={reveal.oppPick} size="lg" /></div>
            </div>
          </motion.div>
        )}

        {isAuthenticated && !myOpenMatch && (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <div className="flex gap-3">
              {(["heads", "tails"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setPick(s)}
                  className={cn("inline-flex items-center gap-2 rounded-xl border-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all",
                    pick === s ? "border-apex-red bg-apex-red/20 text-white" : "border-white/15 text-white/50 hover:border-white/30")}>
                  <Crown className="size-5" />{s}
                </button>
              ))}
            </div>
            <div className="w-full"><BetInput value={bet} onChange={setBet} max={state.cash} /></div>
            <button type="button" onClick={postMatch} disabled={busy || state.cash < bet}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-40">
              {busy ? <CircleDot className="size-4 animate-spin" /> : <Swords className="size-4" />}
              Post Match — ${bet.toLocaleString()}
            </button>
            <p className="text-center text-xs text-white/30">Your bet is held while you wait. Winner takes both stakes (2×). Cancel anytime for a refund — unmatched matches auto-refund after 5 minutes.</p>
          </div>
        )}

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-white/40">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live matches{openMatches ? ` (${lobby.length})` : ""}
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
                    <p className="text-xs text-white/40">picked <span className="font-bold uppercase text-white/70">{m.creatorPick}</span> · ${m.bet.toLocaleString()}</p>
                  </div>
                  <button type="button" disabled={busy || state.cash < m.bet} onClick={() => joinFn(m)}
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-blue-700 disabled:opacity-40">
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
