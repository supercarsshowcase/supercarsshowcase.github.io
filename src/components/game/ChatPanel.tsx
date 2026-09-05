import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Send, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "bg-apex-red text-white" },
  admin: { label: "Admin", color: "bg-orange-600 text-white" },
  moderator: { label: "Mod", color: "bg-blue-600 text-white" },
};

/**
 * Chat rail: stretches with the game row (matching the sidebar and main
 * panel heights) on ≥md screens, but never taller than the viewport, so it
 * can never push the page or the game out of fit.
 */
export function ChatPanel({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const messages = useQuery(api.chat.getMessages) ?? [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the list scrolled to the bottom via its own scrollTop —
  // scrollIntoView would also scroll every scrollable ancestor (including
  // the page itself), yanking the whole game when new messages arrive.
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length, autoScroll]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ text: msg });
      setText("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="hidden w-56 shrink-0 flex-col self-stretch overflow-hidden rounded-xl border border-apex-line bg-apex-panel shadow-[0_10px_40px_rgba(0,0,0,0.5)] md:flex"
      style={{ maxHeight: "calc(100dvh - 0.75rem)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-apex-line px-2.5 py-2">
        <MessageCircle className="size-3.5 text-apex-red" />
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-white">
          Chat
        </span>
        <span className="rounded-full bg-green-500/20 px-1.5 py-px text-[8px] font-bold uppercase text-green-400">
          Live
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto rounded p-0.5 text-white/30 transition-colors hover:text-white"
          aria-label="Close chat"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="chat-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-[12px] text-white/25">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const mine = user != null && msg.userId === user._id;
          const badge = msg.role ? ROLE_BADGES[msg.role] : undefined;
          return (
            <div
              key={msg._id}
              className={cn("flex items-start gap-2", mine && "flex-row-reverse")}
            >
              {msg.image ? (
                <img
                  src={msg.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="mt-0.5 size-5 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    mine ? "bg-apex-red/40 text-apex-red" : "bg-white/10 text-white/70",
                  )}
                >
                  {(mine ? user?.name : msg.name)?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div
                className={cn(
                  "min-w-0 max-w-[85%] rounded-lg px-2.5 py-1.5",
                  mine
                    ? "border border-apex-red/30 bg-apex-red/10"
                    : "bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "truncate text-[10px] font-bold",
                      mine ? "text-apex-red" : "text-white/60",
                    )}
                  >
                    {mine ? "You" : msg.name}
                  </span>
                  {badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase",
                        badge.color,
                      )}
                    >
                      {badge.label}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[9px] text-white/25">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 break-words text-[12px] leading-snug text-white/85">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-apex-line px-2.5 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={
              !isAuthenticated
                ? "Sign in to chat"
                : (error ?? "Type a message...")
            }
            disabled={!isAuthenticated || sending}
            className={cn(
              "min-w-0 flex-1 rounded-md border bg-white/5 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-apex-red/50",
              error ? "border-red-500/40 placeholder:text-red-300/70" : "border-white/10",
            )}
          />
          <button
            type="submit"
            disabled={!isAuthenticated || !text.trim() || sending}
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-apex-red text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
            aria-label="Send message"
          >
            <Send className="size-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
