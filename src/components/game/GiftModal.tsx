import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Gift, Search, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/game/data";
import type { Id } from "@/convex/_generated/dataModel";

const MAX_GIFT = 10_000_000;

interface GiftModalProps {
  open: boolean;
  onClose: () => void;
  currentCash: number;
}

export function GiftModal({ open, onClose, currentCash }: GiftModalProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const searchUsers = useQuery(
    api.gifting.searchUsers,
    search.length >= 2 ? { search } : "skip"
  );
  const giftCash = useMutation(api.gifting.giftCash);

  const quickAmounts = [
    100_000,
    500_000,
    1_000_000,
    5_000_000,
    10_000_000,
  ].filter((v) => v <= Math.min(currentCash, MAX_GIFT));

  const handleSend = useCallback(async () => {
    if (!selectedUser || !amount) {
      toast.error("Select a recipient and enter an amount");
      return;
    }

    const numAmount = Number(amount);
    if (numAmount <= 0 || !isFinite(numAmount)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (numAmount > MAX_GIFT) {
      toast.error(`Maximum gift is ${fmtMoney(MAX_GIFT)}`);
      return;
    }
    if (numAmount > currentCash) {
      toast.error("You don't have enough cash");
      return;
    }

    setSending(true);
    try {
      await giftCash({
        recipientId: selectedUser.id as Id<"users">,
        amount: numAmount,
      });
      toast.success(`Sent ${fmtMoney(numAmount)} to ${selectedUser.name}!`);
      setSelectedUser(null);
      setAmount("");
      setSearch("");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send gift");
    } finally {
      setSending(false);
    }
  }, [selectedUser, amount, currentCash, giftCash, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <Gift className="size-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Gift Cash
              </h2>
              <p className="text-xs text-white/40">
                Send up to {fmtMoney(MAX_GIFT)} to another player
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Balance */}
        <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            Your Balance
          </p>
          <p className="font-display text-xl font-bold text-emerald-400">
            {fmtMoney(currentCash)}
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Recipient
          </label>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedUser.name}
                  </p>
                  {selectedUser.email && (
                    <p className="text-[10px] text-white/30">
                      {selectedUser.email}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-white/[0.08] bg-[#0b0b0c] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Search Results */}
          {!selectedUser && search.length >= 2 && searchUsers !== undefined && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0b0b0c]">
              {searchUsers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-white/30">No users found</p>
              ) : (
                searchUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser({ id: u.id, name: u.name, email: u.email });
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex size-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/60">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {u.name}
                        {u.username && (
                          <span className="ml-1 text-white/30">@{u.username}</span>
                        )}
                      </p>
                      {u.email && (
                        <p className="truncate text-[10px] text-white/30">
                          {u.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-white/30">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={1}
              max={MAX_GIFT}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0b0b0c] py-2.5 pl-7 pr-3 font-display text-lg font-bold text-white outline-none transition-colors placeholder:text-white/20 focus:border-emerald-500/50"
            />
          </div>

          {/* Quick amounts */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickAmounts.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors",
                  Number(amount) === v
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                )}
              >
                {fmtMoney(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedUser || !amount || sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {sending ? "Sending..." : "Send Gift"}
        </button>

        <p className="mt-3 text-center text-[10px] text-white/20">
          Maximum gift: {fmtMoney(MAX_GIFT)} per transaction
        </p>
      </div>
    </div>
  );
}
