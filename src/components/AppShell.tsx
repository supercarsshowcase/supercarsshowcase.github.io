import { Fragment, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  Menu,
  X,
  Plus,
  Bell,
  Trophy,
  Ticket,
  Sparkles,
  Star,
  Send,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
} from "lucide-react";
import { useGems, formatGems } from "@/context/gem-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type GameRoute = "/roulette" | "/tower" | "/mines" | "/blackjack" | "/multibattles";

const GAMES: { to: GameRoute; label: string; icon: string; live: boolean }[] = [
  { to: "/multibattles", label: "Multibattles", icon: "🎯", live: true },
  { to: "/roulette", label: "Roulette", icon: "🎲", live: true },
  { to: "/tower", label: "Tower", icon: "🏰", live: true },
  { to: "/mines", label: "Mines", icon: "💣", live: true },
  { to: "/blackjack", label: "Blackjack", icon: "🃏", live: true },
];

const COMMUNITY_LINKS = [
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/promo", label: "Promo Code", icon: Ticket },
];

const MORE_LINKS = [
  { to: "/earn", label: "Earn", icon: Sparkles },
];

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  isBot?: boolean;
  level?: number;
}

const MOCK_CHAT: ChatMessage[] = [
  { id: 1, user: "PETBET BOT", message: "Rain started — join in the next 60s to win 100M", time: "", isBot: true },
  { id: 2, user: "PETBET BOT", message: "PR3PPY_AZUKI10 won 100M in the rain", time: "", isBot: true },
  { id: 3, user: "DONERNACHO1", message: "Yo wsp how is everyone doing?", time: "11:16", level: 8 },
  { id: 4, user: "DONERNACHO1", message: "forget about this site join my server(no site) just gamble bot in server", time: "11:17", level: 8 },
  { id: 5, user: "DONERNACHO1", message: "Bruh I'm getting nohems", time: "11:17", level: 8 },
];

function GemDiamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-petbet-gem", className)}>
      <path d="M12 2L2 9l10 13L22 9l-10-7zm0 2.5L19 9l-7 9.5L5 9l7-4.5z" />
    </svg>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-petbet-line bg-petbet-sidebar transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* Menu toggle */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-md text-petbet-muted transition-colors hover:bg-petbet-panel hover:text-white"
        >
          <Menu className="size-4" />
        </button>
        {!collapsed && (
          <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-white/60">
            Menu
          </span>
        )}
      </div>

      {/* Games */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2 px-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-petbet-muted">
              Games
            </span>
          )}
        </div>
        {GAMES.map((game) => (
          <NavLink
            key={game.to}
            to={game.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-petbet-blue/15 text-petbet-blue"
                  : "text-white/60 hover:bg-petbet-panel hover:text-white",
              )
            }
          >
            <span className="text-base">{game.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1">{game.label}</span>
                {game.live && (
                  <span className="rounded bg-petbet-green/20 px-1.5 py-0.5 text-[10px] font-bold text-petbet-green">
                    LIVE
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Community */}
        <div className="mb-2 mt-6 px-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-petbet-muted">
              Community
            </span>
          )}
        </div>
        {COMMUNITY_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-petbet-blue/15 text-petbet-blue"
                  : "text-white/60 hover:bg-petbet-panel hover:text-white",
              )
            }
          >
            <link.icon className="size-4 shrink-0" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}

        {/* More */}
        <div className="mb-2 mt-6 px-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-petbet-muted">
              More
            </span>
          )}
        </div>
        {MORE_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-petbet-blue/15 text-petbet-blue"
                  : "text-white/60 hover:bg-petbet-panel hover:text-white",
              )
            }
          >
            <link.icon className="size-4 shrink-0" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Discord link at bottom */}
      {!collapsed && (
        <div className="border-t border-petbet-line px-3 py-3">
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-petbet-muted transition-colors hover:text-white"
          >
            <MessageCircle className="size-4" />
            Discord
          </a>
        </div>
      )}
    </aside>
  );
}

function Header({ onOpenWithdraw }: { onOpenWithdraw: () => void }) {
  const { gems } = useGems();
  const { user } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-petbet-line bg-petbet-header px-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <GemDiamond className="size-6" />
        <span className="font-display text-xl font-black tracking-tight text-white">
          PETBET99
        </span>
      </Link>

      {/* Gem balance */}
      <button
        type="button"
        onClick={onOpenWithdraw}
        className="flex items-center gap-2 rounded-lg border border-petbet-line-strong bg-petbet-panel px-4 py-2 transition-colors hover:border-petbet-blue/50"
      >
        <GemDiamond className="size-4" />
        <span className="text-sm font-bold text-white">{formatGems(gems)}</span>
        <div className="flex size-5 items-center justify-center rounded-md bg-petbet-blue/20 text-petbet-blue">
          <Plus className="size-3" />
        </div>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg border border-petbet-line-strong bg-petbet-panel text-white/60 transition-colors hover:text-white"
        >
          <Bell className="size-4" />
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-petbet-blue text-[9px] font-bold text-white">
            10
          </span>
        </button>
        <div className="flex size-9 items-center justify-center rounded-lg border border-petbet-line-strong bg-petbet-panel">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-white/60">
              {user?.name?.[0] ?? "P"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function ChatPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [message, setMessage] = useState("");

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex h-full w-[40px] shrink-0 items-center justify-center border-l border-petbet-line bg-petbet-sidebar text-petbet-muted transition-colors hover:text-white"
      >
        <ChevronLeft className="size-4" />
      </button>
    );
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-petbet-line bg-petbet-sidebar">
      <div className="flex items-center justify-between border-b border-petbet-line px-3 py-2">
        <span className="text-xs font-semibold text-white/60">Chat</span>
        <button
          type="button"
          onClick={onToggle}
          className="text-petbet-muted hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {MOCK_CHAT.map((msg) => (
          <div key={msg.id} className="mb-3">
            {msg.isBot ? (
              <div className="rounded-lg bg-petbet-panel-2 p-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <GemDiamond className="size-3" />
                  <span className="text-[10px] font-bold uppercase text-petbet-blue">
                    {msg.user.replace(" ", "\u00A0")}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/70">{msg.message}</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-petbet-panel-3 text-xs">
                  {msg.user[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white/80">
                      @{msg.user}
                    </span>
                    {msg.level && (
                      <span className="rounded bg-petbet-blue/20 px-1 py-0.5 text-[9px] font-bold text-petbet-blue">
                        {msg.level}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-petbet-muted">
                      {msg.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/60">{msg.message}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Content Creator promo */}
        <div className="mt-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
          <p className="text-center text-xs text-white/70">
            🎁 Want to become a{" "}
            <span className="font-bold text-white">Content Creator</span> and get{" "}
            <span className="font-bold text-white">sponsored by PetBet</span>? Create
            a ticket on our Discord!
          </p>
        </div>
      </div>

      {/* Chat input */}
      <div className="border-t border-petbet-line p-3">
        <div className="flex items-center gap-2 rounded-lg bg-petbet-panel-2 px-3 py-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Drop a message..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-petbet-muted focus:outline-none"
          />
          <button type="button" className="text-petbet-muted hover:text-white">
            <span className="text-sm">😊</span>
          </button>
          <button type="button" className="text-petbet-blue hover:text-petbet-blue-bright">
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function WithdrawModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { gems } = useGems();
  const [amount, setAmount] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-petbet-line-strong bg-petbet-panel p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-petbet-blue/20">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-5 text-petbet-blue"
              >
                <path d="M12 2l-8 8h5v10h6V10h5l-8-8z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">
              Withdraw
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-petbet-panel-2 text-petbet-muted hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-petbet-muted">Available:</span>
          <span className="font-bold text-petbet-gem">{formatGems(gems)}</span>
        </div>

        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-center text-xs text-yellow-400">
            ⚠️ Mailbox must be ON — if OFF, withdrawn gems are lost.
          </p>
        </div>

        <div className="mb-4 rounded-lg bg-petbet-panel-2 p-4">
          <p className="mb-2 text-sm font-bold text-white">0 locked</p>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-petbet-panel-3">
            <div className="h-full w-0 rounded-full bg-petbet-gem" />
          </div>
          <p className="text-[11px] text-petbet-muted">
            Wager <span className="text-white">1.7B</span> more to unlock <span className="text-white">0</span> gems.
          </p>
          <p className="text-[11px] text-petbet-muted">
            Progress: <span className="text-petbet-blue">847.5M</span> / 2.5B ·{" "}
            <span className="text-white">1.7B</span> to go
          </p>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-petbet-blue py-2.5 text-sm font-bold text-white"
          >
            Mailbox
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-petbet-panel-2 py-2.5 text-sm font-bold text-petbet-muted"
          >
            Trade soon
          </button>
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
          Select a Bot
        </p>

        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-center text-xs text-red-400">
            ⚠️ No bots with gems are online
          </p>
        </div>

        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 100M, 1B"
          className="mb-4 w-full rounded-lg border border-petbet-line-strong bg-petbet-panel-2 px-4 py-3 text-sm text-white placeholder:text-petbet-muted focus:border-petbet-blue focus:outline-none"
        />

        <button
          type="button"
          className="w-full rounded-lg bg-petbet-blue py-3 text-sm font-bold text-white transition-colors hover:bg-petbet-blue-bright"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const isLanding = location.pathname === "/";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-petbet-ink text-white">
      {/* Header */}
      <Header onOpenWithdraw={() => setShowWithdraw(true)} />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        {!isLanding && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Chat panel */}
        {!isLanding && (
          <ChatPanel
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((v) => !v)}
          />
        )}
      </div>

      {/* Withdraw modal */}
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
      />
    </div>
  );
}
