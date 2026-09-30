import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { applyCarOverrides } from "@/data/cars";
import { setThumbCatalog } from "@/data/enrich";
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

  // ── Convex-served car thumbnails ──
  // The seeder resolves every photo-less car's real thumbnail server-side
  // into Convex file storage, so photos come from the app's own backend
  // (immutable-cached) instead of each visitor's browser reaching Wikimedia.
  const thumbCatalog = useQuery(api.thumbs.catalog);
  useEffect(() => {
    if (thumbCatalog) {
      setThumbCatalog(
        thumbCatalog.map((e) => ({ key: e.key, storageId: e.storageId })),
      );
    }
  }, [thumbCatalog]);

  // Idempotent kickoff: make sure the catalog covers the current car set.
  const kickoffSeeds = useMutation(api.thumbs.kickoff);
  useEffect(() => {
    kickoffSeeds({}).catch(() => {
      // seeding is best-effort — the wiki fallback tier still applies
    });
  }, [kickoffSeeds]);

  // Self-draining seed loop: while rows are pending, run one bounded chunk;
  // each chunk's writes recompute `progress`, which re-arms this effect until
  // pending hits 0. Idempotent and first-writer-wins, so overlapping visitors
  // are safe. A full seed is ~90 chunks once ever; afterwards this no-ops.
  // Pacing: 2s between chunks normally, 30s after an all-failure chunk (a
  // rate-limited upstream shouldn't be retried in a tight loop).
  const seedChunk = useAction(api.thumbs.seedChunk);
  const seedProgress = useQuery(api.thumbs.progress);
  const lastAllFailed = useRef(false);
  useEffect(() => {
    if (!seedProgress || seedProgress.pending === 0) return;
    const t = setTimeout(
      () => {
        seedChunk({ batchSize: 20 })
          .then((r) => {
            lastAllFailed.current = r.stored + r.missed === 0 && r.failed > 0;
          })
          .catch(() => {
            // transient failure — progress stays pending and re-arms this effect
          });
      },
      lastAllFailed.current ? 30000 : 2000,
    );
    return () => clearTimeout(t);
  }, [seedProgress, seedChunk]);

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
