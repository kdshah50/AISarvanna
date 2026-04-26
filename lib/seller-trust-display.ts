/**
 * Whether to show “phone / WhatsApp verified” on cards and listing UI.
 * Older rows may have phone_verified null even when trust_badge reflects OTP signup.
 */
export function isSellerPhoneVerifiedForDisplay(u: {
  phone_verified?: boolean | null;
  trust_badge?: string | null;
} | null | undefined): boolean {
  if (!u) return false;
  if (u.phone_verified === true) return true;
  const b = (u.trust_badge ?? "none").toLowerCase();
  return b === "bronze" || b === "gold" || b === "diamond";
}

export function isSellerIneVerified(u: { ine_verified?: boolean | null } | null | undefined): boolean {
  return Boolean(u?.ine_verified);
}

/** Normalize API `users` / row.users for `<SellerVerificationBadges />`. */
export function verificationPropsFromSellerRow(u: {
  trust_badge?: string | null;
  ine_verified?: boolean | null;
  phone_verified?: boolean | null;
} | null | undefined) {
  if (!u) {
    return { trustBadge: "none" as string, ineVerified: false, phoneVerified: false };
  }
  return {
    trustBadge: u.trust_badge ?? "none",
    ineVerified: isSellerIneVerified(u),
    phoneVerified: isSellerPhoneVerifiedForDisplay(u),
  };
}
