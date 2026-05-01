/**
 * PostgREST fragment: active listings + verification rule.
 * In development, `SHOW_PENDING_SERVICES=true` (in .env.local) also returns
 * unverified **services** rows so local UI is not empty before admin approval.
 * Other categories stay verified-only. Production always requires is_verified=true.
 */
export function postgrestActiveListingVerificationFragment(category: string): string {
  const pendingOk =
    process.env.NODE_ENV === "development" &&
    process.env.SHOW_PENDING_SERVICES === "true" &&
    category === "services";
  if (pendingOk) {
    return "status=eq.active&or=(is_verified.eq.true,is_verified.eq.false)";
  }
  return "status=eq.active&is_verified=eq.true";
}
