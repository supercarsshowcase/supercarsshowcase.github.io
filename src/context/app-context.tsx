import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrencyCode } from "@/lib/types";

interface AppContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  region: string;
  setRegion: (region: string) => void;
  favorites: string[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  clearFavorites: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CURRENCY_KEY = "apex.currency";
const REGION_KEY = "apex.region";
const FAVORITES_KEY = "apex.favorites";

function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() =>
    (readStorage(CURRENCY_KEY, "USD") as CurrencyCode) || "USD",
  );
  const [region, setRegionState] = useState<string>(() =>
    readStorage(REGION_KEY, "GB EN"),
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  useEffect(() => {
    try {
      localStorage.setItem(REGION_KEY, region);
    } catch {
      /* ignore */
    }
  }, [region]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const setCurrency = useCallback((value: CurrencyCode) => {
    setCurrencyState(value);
  }, []);

  const setRegion = useCallback((value: string) => {
    setRegionState(value);
  }, []);

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites],
  );

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((prev) =>
      prev.includes(slug)
        ? prev.filter((id) => id !== slug)
        : [...prev, slug],
    );
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      currency,
      setCurrency,
      region,
      setRegion,
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
    }),
    [
      currency,
      setCurrency,
      region,
      setRegion,
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
