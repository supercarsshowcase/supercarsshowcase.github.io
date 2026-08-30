import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useGems, formatGems } from "@/context/gem-context";
import { cn } from "@/lib/utils";

const DAILY_REWARDS = [
  { day: 1, amount: 500_000 },
  { day: 2, amount: 750_000 },
  { day: 3, amount: 1_000_000 },
  { day: 4, amount: 1_500_000 },
  { day: 5, amount: 2_000_000 },
  { day: 6, amount: 3_000_000 },
  { day: 7, amount: 5_000_000 },
];

const TASKS = [
  { name: "Play 5 games", reward: 1_000_000, completed: false },
  { name: "Win a Roulette round", reward: 500_000, completed: false },
  { name: "Reach Tower row 4", reward: 750_000, completed: false },
  { name: "Cash out in Mines", reward: 500_000, completed: false },
  { name: "Win a Blackjack hand", reward: 500_000, completed: false },
];

export default function Earn() {
  const { addGems } = useGems();
  const [claimedDays, setClaimedDays] = useState<Set<number>>(new Set());
  const [claimedTasks, setClaimedTasks] = useState<Set<number>>(new Set());

  const claimDay = (day: number) => {
    if (claimedDays.has(day)) return;
    const reward = DAILY_REWARDS[day - 1].amount;
    addGems(reward);
    setClaimedDays((prev) => new Set([...prev, day]));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="size-6 text-petbet-gold" />
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">
          Earn
        </h1>
      </div>

      {/* Daily Rewards */}
      <div className="mb-8 rounded-xl bg-petbet-panel p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Daily Rewards</h2>
        <div className="grid grid-cols-7 gap-2">
          {DAILY_REWARDS.map((reward) => (
            <button
              key={reward.day}
              type="button"
              onClick={() => claimDay(reward.day)}
              disabled={claimedDays.has(reward.day)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
                claimedDays.has(reward.day)
                  ? "border-petbet-green/50 bg-petbet-green/10"
                  : "border-petbet-line bg-petbet-panel-2 hover:border-petbet-blue/50",
              )}
            >
              <span className="text-[10px] font-bold text-petbet-muted">Day {reward.day}</span>
              <span className="text-xs font-bold text-petbet-gem">
                {formatGems(reward.amount)}
              </span>
              {claimedDays.has(reward.day) && (
                <span className="text-xs text-petbet-green">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-xl bg-petbet-panel p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Tasks</h2>
        <div className="space-y-2">
          {TASKS.map((task, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-petbet-panel-2 px-4 py-3"
            >
              <span className="text-sm text-white/80">{task.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-petbet-gem">
                  +{formatGems(task.reward)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!claimedTasks.has(i)) {
                      addGems(task.reward);
                      setClaimedTasks((prev) => new Set([...prev, i]));
                    }
                  }}
                  disabled={claimedTasks.has(i)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[10px] font-bold uppercase",
                    claimedTasks.has(i)
                      ? "bg-petbet-green/20 text-petbet-green"
                      : "bg-petbet-blue/20 text-petbet-blue hover:bg-petbet-blue/30",
                  )}
                >
                  {claimedTasks.has(i) ? "Claimed" : "Claim"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
