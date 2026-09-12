import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  Send,
  MessageCircle,
  X,
  BadgeCheck,
  Crown,
  Shield,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/** Staff identity — mirrors the announcement overlay colors exactly. */
const ROLE_STYLES: Record<
  string,
  { label: string; name: string; glow: string; border: string; badgeBg: string; ring: string }
> = {
  owner: {
    label: "OWNER",
    name: "text-amber-400",
    glow: "rgba(234,179,8,0.45)",
    border: "border-amber-400/60",
    badgeBg: "bg-amber-400/15 text-amber-300",
    ring: "ring-amber-400/70",
  },
  admin: {
    label: "ADMIN",
    name: "text-apex-red",
    glow: "rgba(255,46,0,0.45)",
    border: "border-apex-red/60",
    badgeBg: "bg-apex-red/15 text-apex-red",
    ring: "ring-apex-red/70",
  },
  moderator: {
    label: "MOD",
    name: "text-emerald-400",
    glow: "rgba(34,197,94,0.45)",
    border: "border-emerald-400/50",
    badgeBg: "bg-emerald-400/15 text-emerald-300",
    ring: "ring-emerald-400/60",
  },
};

/** The verified check next to staff names — same mark as announcements. */
function VerifiedMark({ role }: { role: string }) {
  const style = ROLE_STYLES[role];
  if (!style) return null;
  return (
    <span
      title={`Verified ${style.label}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-px",
        style.badgeBg,
      )}
    >
      {role === "owner" ? (
        <Crown className="size-2.5" strokeWidth={2.5} />
      ) : role === "admin" ? (
        <Shield className="size-2.5" strokeWidth={2.5} />
      ) : (
        <BadgeCheck className="size-3" strokeWidth={2.5} />
      )}
    </span>
  );
}

/**
 * Chat rail: stretches with the game row (matching the sidebar and main
 * panel heights) on ≥md screens, but never taller than the viewport, so it
 * can never push the page or the game out of fit.
 */
export function ChatPanel({
  open,
  onToggle,
  height,
}: {
  open: boolean;
  onToggle: () => void;
  /** FIXED CSS height for the rail, in the game's pre-zoom pixels —
   *  identical on every tab so switching tabs can never resize the rail. */
  height?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const messages = useQuery(api.chat.getMessages) ?? [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const deleteMessage = useMutation(api.chat.deleteMessage);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myRole = user?.role ?? null;
  const isStaff =
    myRole === "owner" || myRole === "admin" || myRole === "moderator";
  const onlineNow = useMemo(() => {
    // Distinct participants in the visible window — a lightweight "live" feel.
    const set = new Set<string>();
    for (const m of messages) set.add(m.userId);
    return set.size;
  }, [messages]);

  // Keep the list scrolled to the bottom via its own scrollTop —
  // scrollIntoView would also scroll every scrollable ancestor (including
  // the page itself), yanking the whole game when new messages arrive.
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }, []);

  const handleSend = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ text: msg });
      setText("");
      setAutoScroll(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  }, [text, sending, sendMessage]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage({ messageId: messageId as never });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete message");
      }
    },
    [deleteMessage],
  );

  if (!open) return null;

  return (
    <div
      className="hidden w-60 shrink-0 flex-col self-stretch overflow-hidden rounded-xl border border-apex-line bg-gradient-to-b from-[#101013] to-[#0a0a0c] shadow-[0_10px_40px_rgba(0,0,0,0.5)] md:flex"
      style={{ height: height ?? "calc(100dvh - 0.75rem)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-apex-line bg-white/[0.02] px-2.5 py-2">
        <span className="relative flex size-4 items-center justify-center">
          <MessageCircle className="size-3.5 text-apex-red" />
          <span className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-green-400" />
        </span>
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-white">
          Chat
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-green-400">
          <span className="size-1 animate-pulse rounded-full bg-green-400" />
          Live · {onlineNow}
        </span>
        {isStaff && myRole && ROLE_STYLES[myRole] && (
          <VerifiedMark role={myRole} />
        )}
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
          const style = msg.role ? ROLE_STYLES[msg.role] : undefined;
          const isStaffMsg = Boolean(style);
          const canDelete = isStaff && !mine;
          return (
            <div
              key={msg._id}
              className={cn("group/msg flex items-start gap-2", mine && "flex-row-reverse")}
            >
              {msg.image ? (
                <img
                  src={msg.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className={cn(
                    "mt-0.5 size-5 shrink-0 rounded-full object-cover ring-1",
                    isStaffMsg ? style!.ring : "ring-white/20",
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1",
                    mine
                      ? "bg-apex-red/25 text-apex-red ring-apex-red/50"
                      : isStaffMsg
                        ? cn(style!.badgeBg, style!.ring)
                        : "bg-white/10 text-white/70 ring-white/15",
                  )}
                >
                  {(mine
                    ? (user?.username ?? user?.name)
                    : msg.name
                  )?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div
                style={
                  isStaffMsg && !mine ? { boxShadow: `0 0 12px ${style!.glow}` } : undefined
                }
                className={cn(
                  "min-w-0 max-w-[85%] rounded-xl border px-2.5 py-1.5 transition-shadow",
                  mine
                    ? "border-apex-red/30 bg-apex-red/10"
                    : isStaffMsg
                      ? style!.border
                      : "border-white/[0.06] bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "truncate text-[10px] font-bold",
                      mine ? "text-apex-red" : isStaffMsg ? style!.name : "text-white/60",
                    )}
                  >
                    {/* Own messages show YOUR name too — hiding it behind
                        "You" also hid the verified mark you asked to see. */}
                    {mine ? (user?.username ?? user?.name ?? "You") : msg.name}
                  </span>
                  {isStaffMsg && <VerifiedMark role={msg.role!} />}
                  {isStaffMsg && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-px text-[7.5px] font-black uppercase tracking-wider",
                        style!.badgeBg,
                      )}
                    >
                      {style!.label}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[9px] text-white/25">
                    {formatTime(msg.createdAt)}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(msg._id)}
                      aria-label="Delete message"
                      title="Delete message"
                      className="ml-1 hidden shrink-0 rounded p-0.5 text-white/25 transition-colors hover:text-apex-red group-hover/msg:flex"
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  )}
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
      <div className="border-t border-apex-line bg-white/[0.02] px-2.5 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={
                !isAuthenticated
                  ? "Sign in to chat"
                  : (error ?? "Message the garage…")
              }
              disabled={!isAuthenticated || sending}
              className={cn(
                "w-full rounded-lg border bg-white/5 px-2.5 py-1.5 pr-12 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-apex-red/50",
                error ? "border-red-500/40 placeholder:text-red-300/70" : "border-white/10",
              )}
            />
            <span className="pointer-events-none absolute bottom-1 right-2 text-[8px] tabular-nums text-white/20">
              {text.length}/500
            </span>
          </div>
          <button
            type="submit"
            disabled={!isAuthenticated || !text.trim() || sending}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-apex-red text-white transition-all hover:bg-apex-red/80 hover:shadow-[0_0_10px_rgba(255,46,0,0.4)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
            aria-label="Send message"
          >
            <Send className="size-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
