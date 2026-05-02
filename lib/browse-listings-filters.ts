import { categoryAllowsDevPendingListings } from "@/lib/marketplace-categories";

/**
 * PostgREST fragment: active listings + verification rule.
 * In development, `SHOW_PENDING_SERVICES=true` (in .env.local) also returns unverified rows for
 * **service-vertical** categories (`serviceVertical` in `marketplace-categories`) so hybrid search
 * can be tested before admin approval. Goods categories stay verified-only. Production always requires is_verified=true.
 */
export function postgrestActiveListingVerificationFragment(category: string): string {
  const pendingOk =
    process.env.NODE_ENV === "development" &&
    process.env.SHOW_PENDING_SERVICES === "true" &&
    categoryAllowsDevPendingListings(category);
  if (pendingOk) {
    return "status=eq.active&or=(is_verified.eq.true,is_verified.eq.false)";
  }
  return "status=eq.active&is_verified=eq.true";
}
