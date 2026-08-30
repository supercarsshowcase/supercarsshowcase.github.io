import { useState } from "react";
import { Ticket } from "lucide-react";
import { useGems, formatGems } from "@/context/gem-context";

export default function Promo() {
  const { addGems } = useGems();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const PROMO_CODES: Record<string, number> = {
    WELCOME: 5_000_000,
    GEMS: 2_000_000,
    FREE5M: 5_000_000,
    GAMBLE: 1_000_000,
  };

  const redeem = () => {
    const upper = code.toUpperCase().trim();
    const amount = PROMO_CODES[upper];
    if (amount) {
      addGems(amount);
      setMessage(`✅ Redeemed! +${formatGems(amount)} gems`);
      setCode("");
    } else {
      setMessage("❌ Invalid promo code");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Ticket className="size-6 text-petbet-blue" />
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">
          Promo Code
        </h1>
      </div>

      <div className="rounded-xl bg-petbet-panel p-6">
        <p className="mb-4 text-sm text-white/60">
          Enter a promo code below to claim free gems!
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setMessage(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
            placeholder="Enter code..."
            className="flex-1 rounded-lg border border-petbet-line-strong bg-petbet-panel-2 px-4 py-3 text-sm text-white placeholder:text-petbet-muted focus:border-petbet-blue focus:outline-none"
          />
          <button
            type="button"
            onClick={redeem}
            className="rounded-lg bg-petbet-blue px-6 py-3 font-display text-sm font-bold uppercase text-white transition-colors hover:bg-petbet-blue-bright"
          >
            Redeem
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm font-bold text-white/80">{message}</p>
        )}
      </div>
    </div>
  );
}
