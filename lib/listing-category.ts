import { isServiceVerticalCategory } from "@/lib/marketplace-categories";

/** True when the listing is a bookable/contact-gated service vertical (not goods cart). */
export function isServicesListing(listing: {
  category_id?: string | null;
  category?: string | null;
} | null): boolean {
  if (!listing) return false;
  const raw = String(listing.category_id ?? listing.category ?? "").trim().toLowerCase();
  return isServiceVerticalCategory(raw);
}
