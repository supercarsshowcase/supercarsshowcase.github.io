import type { Car } from "@/lib/types";

function wiki(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file,
  )}?width=1600`;
}

/**
 * A small set of hand-verified Wikimedia Commons photos used as exact
 * overrides. Every other machine is resolved from Wikipedia by article title
 * (see `carWikiTitle`) so the archive never depends on guessing Commons
 * filenames, which are case-sensitive and frequently renamed.
 */
const CAR_IMAGES: Record<string, string> = {
  "bugatti-chiron": wiki("Bugatti_Chiron_1.jpg"),
  "ferrari-sf90-stradale": wiki("Ferrari_SF90_Stradale.jpg"),
  "lamborghini-aventador-svj": wiki("Lamborghini_Aventador_SVJ.jpg"),
};

const BRAND_IMAGES: Record<string, string> = {
  Bugatti: wiki("Bugatti_Chiron_1.jpg"),
};

/**
 * Build the Wikipedia article title most likely to hold a lead photo for a
 * car. Some marque names are prefixes rather than part of the article title.
 */
export function carWikiTitle(car: Car): string {
  if (car.brand === "BMW M") return `BMW ${car.model}`;
  if (car.brand === "Audi Sport") return `Audi ${car.model}`;
  if (car.brand === "Mercedes-AMG") {
    return `Mercedes-AMG ${car.model.replace(/^AMG\s+/i, "")}`;
  }
  return `${car.brand} ${car.model}`;
}

export interface GalleryImage {
  src: string;
  label: string;
  seed: string;
}

const GALLERY_VIEWS: { key: string; label: string }[] = [
  { key: "front", label: "Studio front" },
  { key: "marque", label: "Marque archive" },
  { key: "rear", label: "Rear three-quarter" },
  { key: "side", label: "Side profile" },
  { key: "cockpit", label: "Cockpit" },
];

/**
 * Five distinct pictures per car. The primary view uses a real photo (verified
 * override or Wikipedia lead image resolved by `SmartImage`); the remaining
 * views are deterministic generated scenes so the gallery is always full and
 * always unique to that car.
 */
export function getCarGallery(car: Car): GalleryImage[] {
  const carSrc = CAR_IMAGES[car.slug] ?? "";
  const brandSrc = BRAND_IMAGES[car.brand] ?? "";

  return GALLERY_VIEWS.map((view, index) => {
    let src = "";
    if (index === 0) src = carSrc;
    if (index === 1) src = brandSrc !== carSrc ? brandSrc : "";
    return {
      src,
      label: view.label,
      seed: `${car.slug}:${view.key}`,
    };
  });
}

/** The primary (front) image for a car — verified override or Wikipedia lead image. */
export function getCarImage(car: Car): string {
  return CAR_IMAGES[car.slug] ?? "";
}

export function getBrandImage(brand: string): string {
  return BRAND_IMAGES[brand] ?? "";
}
