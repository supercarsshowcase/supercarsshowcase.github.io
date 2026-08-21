export type Category =
  | "Hypercar"
  | "Supercar"
  | "Track Car"
  | "Grand Tourer"
  | "Sports Car"
  | "Luxury"
  | "SUV"
  | "Sedan"
  | "Roadster"
  | "Classic"
  | "Electric";

export interface Car {
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: Category;
  priceUSD: number;
  engine: string;
  horsepower: number;
  torqueNm: number;
  zeroToHundredKmh: number;
  topSpeedKmh: number;
  weightKg: number;
  driveType: string;
  transmission: string;
  bodyStyle: string;
  production: string;
  description: string;
}

export interface Milestone {
  year: string;
  title: string;
  detail: string;
}

export interface Brand {
  slug: string;
  name: string;
  founded: number;
  hq: string;
  country: string;
  tagline: string;
  story: string;
  accent: string;
  milestones: Milestone[];
}

export type CurrencyCode = "USD" | "EUR" | "GBP";

export type SortMode =
  | "featured"
  | "price-desc"
  | "price-asc"
  | "year-desc"
  | "year-asc"
  | "speed-desc"
  | "power-desc";
