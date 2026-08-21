import type { CurrencyCode } from "./types";

export const CURRENCIES: Record<
  CurrencyCode,
  { symbol: string; label: string; rate: number }
> = {
  USD: { symbol: "$", label: "USD", rate: 1 },
  EUR: { symbol: "€", label: "EUR", rate: 0.92 },
  GBP: { symbol: "£", label: "GBP", rate: 0.79 },
};

export function convertPrice(usd: number, currency: CurrencyCode): number {
  return usd * CURRENCIES[currency].rate;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Compact grid price — "$2.30M", "£18.70M" */
export function formatPriceCompact(usd: number, currency: CurrencyCode): string {
  const value = convertPrice(usd, currency);
  const symbol = CURRENCIES[currency].symbol;

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const digits = millions >= 100 ? 0 : millions >= 10 ? 1 : 2;
    return `${symbol}${millions.toFixed(digits)}M`;
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}K`;
  }
  return `${symbol}${formatNumber(Math.round(value))}`;
}

/** Full detail price — "$3,900,000" */
export function formatPriceFull(usd: number, currency: CurrencyCode): string {
  const value = convertPrice(usd, currency);
  const symbol = CURRENCIES[currency].symbol;
  return `${symbol}${formatNumber(Math.round(value))}`;
}

export function formatKph(kmh: number): string {
  return `${formatNumber(kmh)} KM/H`;
}

export function formatHp(hp: number): string {
  return `${formatNumber(hp)} HP`;
}

export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} KG`;
}

export function formatTorque(nm: number): string {
  return `${formatNumber(nm)} NM`;
}

export function formatZeroToHundred(seconds: number): string {
  return `${seconds.toFixed(seconds < 2 ? 2 : 1)} S`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function wikipediaSearchUrl(query: string): string {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
}
