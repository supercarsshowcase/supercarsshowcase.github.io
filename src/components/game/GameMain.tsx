import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  Shield,
  Trophy,
  Star,
  Car as CarIcon,
  Save,
  Download,
  Upload,
  Trash2,
  Gift,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import {
  GAME_CAR_MAP,
  RARITY_META,
  STARTER_ID,
  fmtMoney,
  gameCarImage,
  levelFrom,
} from "@/game/data";
import {
  carValue,
  carPower,
  clickValue,
  critChance,
  dailyReward,
  passivePerSec,
  type Action,
} from "@/game/engine";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GamePanels } from "./GamePanels";

const TABS = [
  { id: "garage", label: "Garage" },
  { id: "dealer", label: "Dealers" },
  { id: "crates", label: "Crates" },
  { id: "upgrades", label: "Upgrades" },
  { id: "inventory", label: "Parts" },
  { id: "achievements", label: "Feats" },
  { id: "prestige", label: "Prestige" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
}

export function GameMain({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const [tab, setTab] = useState<TabId>("garage");
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupId = useRef(0);

  const active = GAME_CAR_MAP[state.activeCarId] ?? GAME_CAR_MAP[STARTER_ID];
  const level = levelFrom(state);
  const cash = state.cash;
  const income = passivePerSec(state);
  const perClick = clickValue(state);
  const rarityMeta = RARITY_META[active.rarity];
  const condition = (state.ownedCars[state.activeCarId]?.upgrades.condition ?? 0) / 6;
  const daily = dailyReward(state, new Date());
  const levelBase = Math.max(1, level - state.prestigeLevel * 10);
  const nextLevelEarned = Math.pow(levelBase, 2) * 500;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const crit = Math.random() < critChance(state);
    const amount = Math.round(perClick * (crit ? 5 : 1));
    dispatch({ type: "CLICK", amount });
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++popupId.current;
    const popup: Popup = {
      id,
      x: e.clientX - rect.left + (Math.random() * 40 - 20),
      y: e.clientY - rect.top - 10,
      text: crit ? `CRITICAL +${fmtMoney(amount)}` : `+${fmtMoney(amount)}`,
      crit,
    };
    setPopups((p) => [...p.slice(-24), popup]);
    window.setTimeout(() => {
      setPopups((p) => p.filter((x) => x.id !== id));
    }, 900);
  };

  const claimDaily = () => {
    dispatch({ type: "CLAIM_DAILY", reward: daily });
    toast.success(`Daily reward claimed: ${fmtMoney(daily)}`);
  };

  const handleExport = () => {
    const blob = new Blob([exportSaveJson(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supercars-game-save.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const saved = importSaveJson(String(reader.result));
      if (saved) {
        dispatch({ type: "LOAD", state: saved });
        toast.success("Save imported");
      } else {
        toast.error("Invalid save file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* ── Header / stats bar ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            <span className="inline-block size-2 rounded-full bg-apex-red" />
            The Garage Tycoon
          </p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            GAME
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatPill icon={Coins} label="Cash" value={fmtMoney(cash)} accent />
          <StatPill icon={TrendingUp} label="Income / s" value={fmtMoney(income)} />
          <StatPill icon={MousePointerClick} label="Per click" value={fmtMoney(perClick)} />
          <StatPill icon={Shield} label="Rep" value={String(Math.round(state.reputation).toLocaleString())} />
          <StatPill icon={Trophy} label="Level" value={String(level)} />
          <StatPill icon={Star} label="Prestige" value={String(state.prestigeLevel)} />
          <StatPill icon={CarIcon} label="Cars" value={String(Object.keys(state.ownedCars).length)} />
        </div>
      </div>

      {/* ── Action row: daily + save/export/import/reset ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={claimDaily}
          className="inline-flex items-center gap-2 rounded-md border border-apex-red/40 bg-apex-red/10 px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red"
        >
          <Gift className="size-4 text-apex-red" />
          Daily {fmtMoney(daily)}
          {state.daily.streak > 1 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">×{state.daily.streak}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("supercars.game.v1", JSON.stringify(state));
            toast.success("Game saved");
          }}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
        >
          <Save className="size-4" /> Save
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
        >
          <Download className="size-4" /> Export
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-apex-red hover:text-white">
          <Upload className="size-4" /> Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Hard reset erases ALL game progress. Continue?")) {
              dispatch({ type: "HARD_RESET" });
            }
          }}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-apex-red hover:text-apex-red"
        >
          <Trash2 className="size-4" /> Reset
        </button>
        <span className="ml-auto hidden text-[11px] text-white/30 lg:block">
          Next level: {fmtMoney(nextLevelEarned)} lifetime earnings
        </span>
      </div>

      {/* ── Click zone ── */}
      <div
        onClick={handleClick}
        className="group relative cursor-pointer select-none overflow-hidden rounded-xl border border-apex-line bg-[#0b0b0c]"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(80% 90% at 50% 40%, ${rarityMeta.glow} 0%, transparent 60%), #050505`,
          }}
        />
        <div className="relative flex min-h-[340px] flex-col items-center justify-center p-6 sm:min-h-[420px]">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ borderColor: rarityMeta.color, color: rarityMeta.color, background: `${rarityMeta.color}14` }}
            >
              {rarityMeta.label}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {active.brand} · {active.year}
            </span>
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl">
            {active.name}
          </h2>
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="relative mt-4 w-full max-w-2xl"
          >
            <SmartImage
              src={gameCarImage(active)}
              alt={active.name}
              className="mx-auto w-full max-h-[260px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            />
            <div className="pointer-events-none absolute inset-0" />
          </motion.div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-black text-apex-red">{fmtMoney(perClick)}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">per click</p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-white/90">{fmtMoney(income)}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">per second</p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-white/90">{fmtMoney(carValue(state, state.activeCarId))}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">value</p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-white/90">{carPower(state, state.activeCarId).toLocaleString()}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">power</p>
            </div>
          </div>

          {/* Condition bar */}
          <div className="mt-5 w-full max-w-md">
            <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span>Condition</span>
              <span>{Math.round(condition * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-apex-red"
                animate={{ width: `${condition * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-apex-red/30 bg-apex-red/10 px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            <MousePointerClick className="size-3.5 text-apex-red" />
            Click the car to earn
          </p>
        </div>

        {/* Floating popups */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {popups.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -70, scale: 1.15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className={cn(
                  "absolute font-display text-xl font-black",
                  p.crit ? "text-amber-300" : "text-apex-red",
                )}
                style={{ left: p.x, top: p.y, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
              >
                {p.text}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-apex-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-3.5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] transition-colors",
              tab === t.id ? "text-white" : "text-white/45 hover:text-white",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-apex-red" />}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-white/30 sm:flex">
          <Sparkles className="size-3 text-apex-red" />
          Click the starter 300× for a secret
        </span>
      </div>

      <div className="mt-8">
        <GamePanels tab={tab} state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-apex-line bg-apex-panel px-3 py-1.5">
      <Icon className={cn("size-3.5", accent ? "text-apex-red" : "text-white/40")} />
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <span className="font-display text-sm font-black text-white">{value}</span>
    </div>
  );
}

// Import/export helpers (kept here to avoid engine importing browser APIs twice).
function exportSaveJson(state: GameState): string {
  return JSON.stringify({ ...state });
}

function importSaveJson(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as Partial<GameState>;
    if (!parsed || typeof parsed.cash !== "number") return null;
    return parsed as GameState;
  } catch {
    return null;
  }
}
