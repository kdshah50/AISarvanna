/** Normalize listing category for service checks (DB may use category_id or legacy category, mixed case). */
export function isServicesListing(listing: {
  category_id?: string | null;
  category?: string | null;
} | null): boolean {
  if (!listing) return false;
  const raw = listing.category_id ?? listing.category ?? "";
  return String(raw).trim().toLowerCase() === "services";
}
