import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";

const DURATION_MS = 5000;
// A broadcast only plays if it was sent within this window — so a page reload
// minutes later never replays an old announcement.
const FRESH_WINDOW_MS = 10_000;

/**
 * Shows the latest admin broadcast at the top-center of the page, just below
 * the header so it never covers the nav/search UI. All messages in a batch
 * appear at once, stacked one under the other, then the whole stack fades
 * after ~5 seconds. Convex reactivity means a new broadcast shows for
 * everybody with no refresh.
 */
export function AnnouncementOverlay() {
  const latest = useQuery(api.site.getAnnouncementBatch);
  const [messages, setMessages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [batchId, setBatchId] = useState("");
  const lastSeen = useRef<string | null>(null);

  // Load a new broadcast — but only play it when fresh. Old announcements
  // (e.g. from a previous visit) are ignored on page reload.
  useEffect(() => {
    if (!latest) return;
    const id = String(latest._id);
    if (lastSeen.current === id) return;
    lastSeen.current = id;
    const fresh = Date.now() - latest.createdAt <= FRESH_WINDOW_MS;
    setBatchId(id);
    setName(latest.authorName);
    setMessages(fresh ? latest.messages ?? [] : []);
  }, [latest]);

  // Hide the whole stack after a few seconds.
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => setMessages([]), DURATION_MS);
    return () => clearTimeout(timer);
  }, [messages]);

  const showing = messages.length > 0;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key={batchId}
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ x: "-50%" }}
          className="pointer-events-none fixed left-1/2 top-24 z-[90] flex w-[min(620px,calc(100vw-2rem))] flex-col gap-2"
        >
          {messages.map((message, i) => (
            <div
              key={`${batchId}-${i}`}
              className="flex items-start gap-3 rounded-lg border border-apex-red/50 bg-black/92 px-4 py-3 shadow-[0_0_45px_-6px_rgba(255,46,0,0.65)] backdrop-blur-md"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-apex-red/15">
                <Megaphone className="size-3.5 text-apex-red" />
              </span>
              <p className="text-sm leading-6 text-white/90">
                <span className="font-display text-[13px] font-bold uppercase tracking-wide text-apex-red">
                  {name}:
                </span>{" "}
                {message}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
