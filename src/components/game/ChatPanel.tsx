import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Send, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "bg-apex-red text-white" },
  admin: { label: "Admin", color: "bg-orange-600 text-white" },
  moderator: { label: "Mod", color: "bg-blue-600 text-white" },
};

export function ChatPanel({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const messages = useQuery(api.chat.getMessages) ?? [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, autoScroll]);

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
    <div className="hidden h-full w-[17rem] shrink-0 flex-col rounded-xl border border-apex-line bg-apex-panel lg:flex">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-apex-line px-3 py-1.5">
        <MessageCircle className="size-3 text-apex-red" />
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-white">
          Live Chat
        </span>
        <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[6px] font-bold text-green-400">
          ● LIVE
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto rounded p-0.5 text-white/30 transition-colors hover:text-white"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 space-y-1 overflow-y-auto px-2 py-1.5"
      >
        {messages.length === 0 && (
          <p className="mt-6 text-center text-[9px] text-white/25">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const badge = msg.role ? ROLE_BADGES[msg.role] : undefined;
          return (
            <div
              key={msg._id}
              className="group rounded-lg bg-white/[0.03] px-2 py-1 transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-1.5">
                {msg.image ? (
                  <img
                    src={msg.image}
                    alt=""
                    className="size-3.5 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-apex-red/30 text-[6px] font-bold text-apex-red">
                    {msg.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate font-display text-[8px] font-bold text-white/80">
                  {msg.name}
                </span>
                {badge && (
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[5px] font-bold uppercase",
                      badge.color,
                    )}
                  >
                    {badge.label}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[6px] text-white/20">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 pl-[20px] text-[9px] leading-relaxed text-white/60 break-words">
                {msg.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-apex-line px-2 py-1.5">
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
            placeholder={error ?? "Type a message..."}
            disabled={sending}
            className={cn(
              "flex-1 rounded-md border bg-white/5 px-2 py-1 text-[9px] text-white placeholder:text-white/25 focus:border-apex-red/50 focus:outline-none",
              error ? "border-red-500/40 placeholder:text-red-300/70" : "border-white/10",
            )}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-apex-red text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            <Send className="size-2.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
