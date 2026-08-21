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

/** Curated, high-confidence images for a handful of hero cars. */
export const CAR_IMAGES: Record<string, string> = {
  "bugatti-chiron": wiki("Bugatti_Chiron_1.jpg"),
  "bugatti-veyron-16-4": wiki(
    "Bugatti_Veyron_16.4_–_Frontansicht_(1),_5._April_2012,_Düsseldorf.jpg",
  ),
  "ferrari-laferrari": wiki("LaFerrari_in_Beverly_Hills_(14582579874).jpg"),
};

export function getCarImage(car: Car): string {
  return CAR_IMAGES[car.slug] ?? BRAND_IMAGES[car.brand] ?? "";
}

export function getBrandImage(brand: string): string {
  return BRAND_IMAGES[brand] ?? "";
}
