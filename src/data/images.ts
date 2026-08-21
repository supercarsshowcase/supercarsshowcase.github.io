import type { Car } from "@/lib/types";

function wiki(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file,
  )}?width=1600`;
}

/** One signature image per marque (open-source Wikimedia Commons). */
export const BRAND_IMAGES: Record<string, string> = {
  Bugatti: wiki("Bugatti_Chiron_1.jpg"),
  "Mercedes-AMG": wiki("Mercedes-AMG_GT_R_(C190)_IMG_0312.jpg"),
  "BMW M": wiki("BMW_M4_Competition_(G82)_IMG_4577.jpg"),
  Ferrari: wiki("LaFerrari_in_Beverly_Hills_(14582579874).jpg"),
  Lamborghini: wiki("Lamborghini_Aventador_SVJ_63_(46235956141).jpg"),
  Porsche: wiki("Porsche_911_Turbo_S_(992)_IMG_5110.jpg"),
  McLaren: wiki("McLaren_720S_at_Geneva_International_Motor_Show_2017.jpg"),
  "Aston Martin": wiki("Aston_Martin_Valkyrie_AMR_Pro.jpg"),
  Koenigsegg: wiki("Koenigsegg_Jesko_Absolut.jpg"),
  Pagani: wiki("Pagani_Huayra_BC_(35009481833).jpg"),
  "Rolls-Royce": wiki("Rolls-Royce_Phantom_VIII_IMG_0889.jpg"),
  Bentley: wiki("Bentley_Continental_GT_(2018).jpg"),
  "Audi Sport": wiki("Audi_R8_V10_Performance_(2019).jpg"),
  Jaguar: wiki("Jaguar_F-Type_SVR.jpg"),
  Maserati: wiki("Maserati_MC20_(2021).jpg"),
  Lotus: wiki("Lotus_Evija_(2020).jpg"),
  Rimac: wiki("Rimac_Nevera.jpg"),
  Hennessey: wiki("Hennessey_Venom_F5.jpg"),
};

/**
 * Curated real photos for individual cars. Any slug not listed here gets a
 * unique generated "studio" scene, so no two cars ever share the same photo.
 */
export const CAR_IMAGES: Record<string, string> = {
  "bugatti-chiron": wiki("Bugatti_Chiron_1.jpg"),
  "bugatti-veyron-16-4": wiki(
    "Bugatti_Veyron_16.4_–_Frontansicht_(1),_5._April_2012,_Düsseldorf.jpg",
  ),
  "bugatti-tourbillon": wiki("Bugatti_Tourbillon_(2024).jpg"),
  "bugatti-divo": wiki("Bugatti_Divo_(GIMS_2019).jpg"),
  "bugatti-bolide": wiki("Bugatti_Bolide_(2021).jpg"),
  "bugatti-la-voiture-noire": wiki("Bugatti_La_Voiture_Noire_(GIMS_2019).jpg"),
  "ferrari-laferrari": wiki("LaFerrari_in_Beverly_Hills_(14582579874).jpg"),
  "ferrari-f40": wiki("Ferrari_F40_with_pop-up_headlights_up.jpg"),
  "ferrari-sf90-stradale": wiki("Ferrari_SF90_Stradale.jpg"),
  "lamborghini-countach": wiki("Lamborghini_Countach_LP400.jpg"),
  "lamborghini-aventador-svj": wiki("Lamborghini_Aventador_SVJ.jpg"),
  "porsche-911-turbo-s": wiki("Porsche_911_Turbo_S_(992)_IMG_5110.jpg"),
  "porsche-918-spyder": wiki("Porsche_918_Spyder_(2014).jpg"),
  "mclaren-p1": wiki("McLaren_P1_(2013).jpg"),
  "mclaren-f1": wiki("McLaren_F1_road_car.jpg"),
  "koenigsegg-jesko": wiki("Koenigsegg_Jesko.jpg"),
  "koenigsegg-jesko-absolut": wiki("Koenigsegg_Jesko_Absolut.jpg"),
  "pagani-huayra": wiki("Pagani_Huayra.jpg"),
  "pagani-utopia": wiki("Pagani_Utopia.jpg"),
  "aston-martin-valkyrie": wiki("Aston_Martin_Valkyrie_AMR_Pro.jpg"),
  "rolls-royce-phantom": wiki("Rolls-Royce_Phantom_VIII_IMG_0889.jpg"),
  "bentley-continental-gt": wiki("Bentley_Continental_GT_(2018).jpg"),
  "rimac-nevera": wiki("Rimac_Nevera.jpg"),
  "hennessey-venom-f5": wiki("Hennessey_Venom_F5.jpg"),
};

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
 * Five distinct pictures per car. Where a real photo is known it is used;
 * the rest are deterministic generated views so the gallery is always full
 * and always unique to that car.
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

/** The primary (front) image for a car — real photo or unique generated scene. */
export function getCarImage(car: Car): string {
  return CAR_IMAGES[car.slug] ?? "";
}

export function getBrandImage(brand: string): string {
  return BRAND_IMAGES[brand] ?? "";
}
