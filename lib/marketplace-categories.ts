/**
 * Categories shown in the top bar. Only `browseEnabled: true` are clickable.
 *
 * `serviceVertical: true` — same booking/contact semantics as core “services” where relevant, and in **development**
 * with `SHOW_PENDING_SERVICES=true`, unverified rows surface for hybrid-search testing (see `browse-listings-filters`).
 * Keep `PRICE_FLOORS` in `app/api/listings/route.ts` in sync with every enabled `id`.
 */
export type MarketplaceCategory = {
  id: string;
  icon: string;
  label: { es: string; en: string };
  browseEnabled: boolean;
  /** Service-like browse vertical (dev pending listings + future booking flows). */
  serviceVertical?: boolean;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { id: "services", icon: "🔧", label: { es: "Servicios", en: "Services" }, browseEnabled: true, serviceVertical: true },

  { id: "beauty", icon: "💇", label: { es: "Belleza", en: "Beauty" }, browseEnabled: true, serviceVertical: true },
  { id: "childcare", icon: "👶", label: { es: "Cuidado infantil", en: "Childcare" }, browseEnabled: true, serviceVertical: true },
  { id: "tutoring", icon: "📚", label: { es: "Clases / tutorías", en: "Tutoring" }, browseEnabled: true, serviceVertical: true },
  { id: "pet_care", icon: "🐕", label: { es: "Mascotas", en: "Pet care" }, browseEnabled: true, serviceVertical: true },
  { id: "fitness", icon: "🏋️", label: { es: "Fitness", en: "Fitness" }, browseEnabled: true, serviceVertical: true },
  { id: "handyman", icon: "🛠️", label: { es: "Reparaciones", en: "Handyman" }, browseEnabled: true, serviceVertical: true },
  { id: "landscaping", icon: "🌿", label: { es: "Jardinería", en: "Landscaping" }, browseEnabled: true, serviceVertical: true },

  { id: "electronics", icon: "📱", label: { es: "Electrónica", en: "Electronics" }, browseEnabled: true },
  { id: "vehicles", icon: "🚗", label: { es: "Vehículos", en: "Vehicles" }, browseEnabled: true },
  { id: "fashion", icon: "👗", label: { es: "Moda", en: "Fashion" }, browseEnabled: true },
  { id: "home", icon: "🏠", label: { es: "Hogar", en: "Home" }, browseEnabled: true },
  { id: "realestate", icon: "🏡", label: { es: "Bienes Raíces", en: "Real Estate" }, browseEnabled: true },
  { id: "sports", icon: "⚽", label: { es: "Deportes", en: "Sports" }, browseEnabled: true },
];

const ENABLED_IDS = new Set(
  MARKETPLACE_CATEGORIES.filter((c) => c.browseEnabled).map((c) => c.id)
);

/** Safe slug for PostgREST `category_id=eq.<slug>`. */
export function normalizeBrowseCategory(raw: string | undefined | null): string {
  const s = (raw ?? "services").trim().toLowerCase();
  if (ENABLED_IDS.has(s)) return s;
  return "services";
}

export function categoryLabel(categoryId: string, lang: "es" | "en"): string {
  const c = MARKETPLACE_CATEGORIES.find((x) => x.id === categoryId);
  return c?.label[lang] ?? (lang === "en" ? "Listings" : "Anuncios");
}

/** Whether `SHOW_PENDING_SERVICES` in dev applies to this `category_id`. */
export function categoryAllowsDevPendingListings(categoryId: string): boolean {
  const c = MARKETPLACE_CATEGORIES.find((x) => x.id === categoryId);
  return Boolean(c?.browseEnabled && c?.serviceVertical);
}

export function isServiceVerticalCategory(categoryId: string): boolean {
  const c = MARKETPLACE_CATEGORIES.find((x) => x.id === categoryId);
  return Boolean(c?.serviceVertical);
}
