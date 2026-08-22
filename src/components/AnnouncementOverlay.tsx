import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";

const DURATION_MS = 5000;

/**
 * Shows the latest admin broadcast at the top-center of the page, just below
 * the header so it never covers the nav/search UI. Plays every message in the
 * batch one after another, ~5 seconds each, then fades out. Convex reactivity
 * means a new broadcast shows for everybody with no refresh.
 */
export function AnnouncementOverlay() {
  const latest = useQuery(api.site.getAnnouncementBatch);
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [batchId, setBatchId] = useState<string>("");
  const lastSeen = useRef<string | null>(null);

  // Load a new, unseen broadcast into the queue.
  useEffect(() => {
    if (!latest) return;
    const id = String(latest._id);
    if (lastSeen.current === id) return;
    lastSeen.current = id;
    setBatchId(id);
    setName(latest.authorName);
    setQueue(latest.messages ?? []);
    setIndex(0);
  }, [latest]);

  // Advance the queue: one message per DURATION_MS until exhausted.
  useEffect(() => {
    if (queue.length === 0 || index >= queue.length) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), DURATION_MS);
    return () => clearTimeout(timer);
  }, [queue, index]);

  const showing = queue.length > 0 && index < queue.length;
  const current = showing ? queue[index] : "";

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key={`${batchId}-${index}`}
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ x: "-50%" }}
          className="pointer-events-none fixed left-1/2 top-24 z-[90]"
        >
          <div className="flex max-w-[620px] items-start gap-3 rounded-lg border border-apex-red/50 bg-black/92 px-4 py-3 shadow-[0_0_45px_-6px_rgba(255,46,0,0.65)] backdrop-blur-md">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-apex-red/15">
              <Megaphone className="size-3.5 text-apex-red" />
            </span>
            <p className="text-sm leading-6 text-white/90">
              <span className="font-display text-[13px] font-bold uppercase tracking-wide text-apex-red">
                {name}:
              </span>{" "}
              {current}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
