/**
 * Default on-page copy for the Home and Garage pages. The owner can override
 * any of these fields from the Admin "Pages" editor. Copy is resolved as
 * `{ ...DEFAULT, ...overrides }` so an empty override simply keeps the default.
 */

export const SITE_UPDATES_COPY: Record<string, string> = {
  updatesEyebrow: "Site Updates",
  updatesTitle: "WHAT'S NEW",
  updatesBody:
    "We are constantly adding new machines, improving the archive, and refining the experience. Check back here for the latest news and improvements to Supercars Showcase.",
};

export const HOME_COPY: Record<string, string> = {
  heroKicker: "Volume 01 — 200 Machines Archived",
  heroLine1: "ENGINES",
  heroSubA: "OF THE",
  heroSubB: "ELITE.",
  heroBody:
    "A cinematic gallery of Bugatti, Mercedes-AMG, BMW M, Ferrari, Lamborghini, Porsche, McLaren and more. Real specs. Real prices. Nothing for sale — just for the eyes.",
  cta1Lbl: "Enter the Machines",
  cta2Lbl: "Bugatti Collection",
  featuredEyebrow: "Featured machines",
  featuredTitle: "THE HALL OF LEGENDS",
  marquesEyebrow: "18 marques, one archive",
  marquesTitle: "BROWSE BY MARQUE",
  ctaHeading: "READY TO DREAM?",
  ctaBody:
    "Step into the archive and wander through the fastest, rarest and most expensive machines ever built.",
  ctaBtn1: "Open the Machines",
  ctaBtn2: "See Rankings",
  featuredSlugs:
    "bugatti-tourbillon,koenigsegg-jesko-absolut,ferrari-daytona-sp3,rimac-nevera-r,lamborghini-revuelto,mclaren-p1",
};

export const NAV_COPY: Record<string, string> = {
  home: "Home",
  garage: "Machines",
  game: "Game",
  rankings: "Rankings",
  favorites: "Favorites",
  myGarage: "Garage",
  feedback: "Feedback",
  admin: "Admin",
  compare: "Compare",
  surprise: "Surprise",
  signIn: "Sign in",
  signOut: "Sign out",
  myFavorites: "My favorites",
  editProfile: "Edit profile",
  compareMachines: "Compare machines",
  adminPanel: "Admin panel",
};

export const GARAGE_COPY: Record<string, string> = {
  filtersLbl: "FILTERS",
  resetLbl: "Reset",
  searchPlaceholder: "Search models...",
  brandLbl: "Brand",
  categoryLbl: "Category",
  rarityLbl: "Rarity",
  priceLbl: "Max Price",
  sortLbl: "Sort By",
  eyebrow: "Machines",
  heading: "{n} MACHINES ARCHIVED.",
  resultsLbl: "{n} RESULTS",
  emptyTitle: "NO MATCHES",
  emptyBody: "Try adjusting your filters.",
  clearLbl: "Clear Filters",
};

/** Replaces template tokens like `{n}` with runtime values. */
export function tmpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
