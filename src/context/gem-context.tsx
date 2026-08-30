import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface GemContextValue {
  gems: number;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  setGems: (amount: number) => void;
}

const GemContext = createContext<GemContextValue | null>(null);

const GEMS_KEY = "petbet99.gems";

function readGems(): number {
  try {
    const raw = localStorage.getItem(GEMS_KEY);
    if (raw !== null) return JSON.parse(raw) as number;
  } catch { /* ignore */ }
  return 10_000_000; // Start with 10M gems
}

export function GemProvider({ children }: { children: ReactNode }) {
  const [gems, setGemsState] = useState<number>(readGems);

  useEffect(() => {
    try {
      localStorage.setItem(GEMS_KEY, JSON.stringify(gems));
    } catch { /* ignore */ }
  }, [gems]);

  const addGems = useCallback((amount: number) => {
    setGemsState((prev) => prev + amount);
  }, []);

  const spendGems = useCallback((amount: number) => {
    let success = false;
    setGemsState((prev) => {
      if (prev >= amount) {
        success = true;
        return prev - amount;
      }
      return prev;
    });
    return success;
  }, []);

  const setGems = useCallback((amount: number) => {
    setGemsState(amount);
  }, []);

  const value = useMemo<GemContextValue>(
    () => ({ gems, addGems, spendGems, setGems }),
    [gems, addGems, spendGems, setGems],
  );

  return <GemContext.Provider value={value}>{children}</GemContext.Provider>;
}

export function useGems(): GemContextValue {
  const context = useContext(GemContext);
  if (!context) {
    throw new Error("useGems must be used within a GemProvider");
  }
  return context;
}

/** Format gem amounts like 100M, 1.5B, etc. */
export function formatGems(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return v === Math.floor(v) ? `${v}B` : `${v.toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return v === Math.floor(v) ? `${v}M` : `${v.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const v = amount / 1_000;
    return v === Math.floor(v) ? `${v}K` : `${v.toFixed(1)}K`;
  }
  return amount.toLocaleString();
}
