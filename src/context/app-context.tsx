import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { applyCarOverrides } from "@/data/cars";
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

  // Owner-editable car overrides — applied globally so edited names, prices,
  // specs and descriptions show across every page and lookup.
  const carOverrides = useQuery(api.cars.getCarOverrides);
  useEffect(() => {
    applyCarOverrides(carOverrides);
  }, [carOverrides]);

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

/**
 * Safe defaults for useApp when no provider value is reachable.
 *
 * The context only carries user preferences (currency, region, favorites),
 * all persisted to localStorage — so a missing provider degrades to defaults
 * instead of white-screening the app.
 *
 * Why this matters: on the live-edit dev server, editing a file re-serves
 * modules with cache-busting timestamps while the already-running tree keeps
 * the OLD module graph. A re-evaluated app-context module creates a NEW
 * context object; components from the new graph then read a context the old
 * AppProvider never filled, and a `throw` here would blank the whole site
 * until a manual full reload. Falling back keeps the site alive and the
 * state self-heals (localStorage) on the next full page load.
 */
const APP_CONTEXT_DEFAULTS: AppContextValue = {
  currency: "USD",
  setCurrency: () => {},
  region: "GB EN",
  setRegion: () => {},
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  clearFavorites: () => {},
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    // See APP_CONTEXT_DEFAULTS above: warn, don't crash. Torn module graphs
    // during live edits are expected; a dead white screen is not.
    if (import.meta.env.DEV) {
      console.warn(
        "useApp: no AppProvider value in this module graph (live-edit module tearing). " +
          "Using defaults — reload the page to restore your currency/region/favorites.",
      );
    }
    return APP_CONTEXT_DEFAULTS;
  }
  return context;
}
