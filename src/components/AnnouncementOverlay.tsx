import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";

// A broadcast only plays if it was sent within this window — so a page reload
// minutes later never replays an old announcement.
const FRESH_WINDOW_MS = 10_000;

// Display time scales with the message: short message = short bar, long
// message = longer bar.
function durationFor(message: string): number {
  const base = 2500;
  const perChar = 40;
  const max = 12_000;
  return Math.min(base + message.length * perChar, max);
}

type Item = { id: string; name: string; message: string; expiresAt: number; colorIdx: number };

// Preset colors for stacked announcements
const ANNOUNCE_COLORS = [
  { border: "rgba(255,46,0,0.65)", glow: "rgba(255,46,0,0.65)", text: "text-apex-red" },
  { border: "rgba(255,149,0,0.65)", glow: "rgba(255,149,0,0.65)", text: "text-amber-400" },
  { border: "rgba(34,197,94,0.55)", glow: "rgba(34,197,94,0.55)", text: "text-emerald-400" },
  { border: "rgba(56,189,248,0.55)", glow: "rgba(56,189,248,0.55)", text: "text-sky-400" },
  { border: "rgba(167,139,250,0.55)", glow: "rgba(167,139,250,0.55)", text: "text-violet-400" },
];

/**
 * Shows admin broadcasts at the top-center of the page, just below the header.
 * New messages stack under the previous ones and each fades away on its own
 * timer — short messages vanish quickly, long ones linger. Convex reactivity
 * means a new broadcast shows for everybody with no refresh.
 */
export function AnnouncementOverlay() {
  const latest = useQuery(api.site.getAnnouncementBatch);
  const [stack, setStack] = useState<Item[]>([]);
  const lastSeen = useRef<string | null>(null);

  // Append a new, unseen broadcast to the bottom of the stack.
  useEffect(() => {
    if (!latest) return;
    const id = String(latest._id);
    if (lastSeen.current === id) return;
    lastSeen.current = id;
    const fresh = Date.now() - latest.createdAt <= FRESH_WINDOW_MS;
    const now = Date.now();
    setStack((prev) => {
      const incoming = fresh
        ? (latest.messages ?? []).map((message, i) => ({
            id: `${id}-${i}`,
            name: latest.authorName,
            message,
            expiresAt: now + durationFor(message),
            colorIdx: (prev.length + i) % ANNOUNCE_COLORS.length,
          }))
        : [];
      return [...prev, ...incoming];
    });
  }, [latest]);

  // Periodically prune messages whose time is up.
  useEffect(() => {
    if (stack.length === 0) return;
    const timer = setTimeout(() => {
      setStack((prev) => prev.filter((item) => item.expiresAt > Date.now()));
    }, 500);
    return () => clearTimeout(timer);
  }, [stack]);

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[90] flex w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {stack.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div
              className="flex items-start gap-3 rounded-lg border bg-black/92 px-4 py-3 backdrop-blur-md"
              style={{
                borderColor: ANNOUNCE_COLORS[item.colorIdx].border,
                boxShadow: `0 0 45px -6px ${ANNOUNCE_COLORS[item.colorIdx].glow}`,
              }}
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/5">
                <Megaphone className={`size-3.5 ${ANNOUNCE_COLORS[item.colorIdx].text}`} />
              </span>
              <p className="text-sm leading-6 text-white/90">
                <span className={`font-display text-[13px] font-bold uppercase tracking-wide ${ANNOUNCE_COLORS[item.colorIdx].text}`}>
                  {item.name}:
                </span>{" "}
                {item.message}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
