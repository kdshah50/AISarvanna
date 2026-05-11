import type { CommunityLane } from "@/lib/community-lane";
import type { Lang } from "@/lib/i18n-lang";

/**
 * Categories shown in the top bar. Only `browseEnabled: true` are clickable.
 *
 * `serviceVertical: true` — same booking/contact semantics as core “services” where relevant, and in **development**
 * with `SHOW_PENDING_SERVICES=true`, unverified rows surface for hybrid-search testing (see `browse-listings-filters`).
 * Keep `PRICE_FLOORS` in `app/api/listings/route.ts` in sync with every enabled `id`.
 *
 * `communityLanes` — when set, the chip is shown mainly for that lane (unset = all lanes).
 */
export type MarketplaceCategory = {
  id: string;
  icon: string;
  label: { es: string; en: string; hi?: string };
  browseEnabled: boolean;
  /** Service-like browse vertical (dev pending listings + future booking flows). */
  serviceVertical?: boolean;
  /** If set, surfaced in the category bar when the user’s `community_lane` matches. */
  communityLanes?: CommunityLane[];
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

  {
    id: "mehndi",
    icon: "💅",
    label: { es: "Mehndi / henna", en: "Mehndi / henna", hi: "मेहंदी" },
    browseEnabled: true,
    serviceVertical: true,
    communityLanes: ["south_asian"],
  },
  {
    id: "tiffin",
    icon: "🍱",
    label: { es: "Tiffins / comida casera", en: "Tiffin / home meals", hi: "टिफिन" },
    browseEnabled: true,
    serviceVertical: true,
    communityLanes: ["south_asian"],
  },
  {
    id: "wedding_services",
    icon: "💒",
    label: { es: "Bodas y eventos", en: "Wedding & events", hi: "शादी और इवेंट" },
    browseEnabled: true,
    serviceVertical: true,
    communityLanes: ["south_asian"],
  },
  {
    id: "ethnic_wear",
    icon: "👘",
    label: { es: "Moda étnica", en: "Ethnic wear", hi: "पारंपरिक पहनावा" },
    browseEnabled: true,
    communityLanes: ["south_asian"],
  },

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

/** True when `id` is a valid top-level browse slug (lowercase `category_id`). */
export function isBrowseEnabledCategoryId(id: string): boolean {
  return ENABLED_IDS.has(id.trim().toLowerCase());
}

/** Safe slug for PostgREST `category_id=eq.<slug>`. */
export function normalizeBrowseCategory(raw: string | undefined | null): string {
  const s = (raw ?? "services").trim().toLowerCase();
  if (ENABLED_IDS.has(s)) return s;
  return "services";
}

export function categoryLabel(categoryId: string, lang: Lang | "hi"): string {
  const c = MARKETPLACE_CATEGORIES.find((x) => x.id === categoryId);
  if (!c) return lang === "es" ? "Anuncios" : "Listings";
  if (lang === "hi") return c.label.hi ?? c.label.en;
  return c.label[lang];
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
