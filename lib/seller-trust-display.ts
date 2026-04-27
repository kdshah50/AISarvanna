/**
 * PostgREST sometimes returns an embedded many-to-one row as a single object
 * or as a one-element array depending on client/view — normalize for reads.
 */
export function embeddedSellerRow<T extends Record<string, unknown>>(
  u: T | T[] | null | undefined
): T | null {
  if (u == null) return null;
  if (Array.isArray(u)) return (u[0] as T | undefined) ?? null;
  return u;
}

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

export function isSellerRfcVerified(u: { rfc_verified?: boolean | null } | null | undefined): boolean {
  return Boolean(u?.rfc_verified);
}

type SellerTrustFields = {
  trust_badge?: string | null;
  ine_verified?: boolean | null;
  rfc_verified?: boolean | null;
  phone_verified?: boolean | null;
};

/** Normalize API `users` / row.users for `<SellerVerificationBadges />`. */
export function verificationPropsFromSellerRow(
  u: SellerTrustFields | SellerTrustFields[] | null | undefined
) {
  const row = embeddedSellerRow(u as Record<string, unknown> | Record<string, unknown>[] | null | undefined) as
    | SellerTrustFields
    | null;
  if (!row) {
    return {
      trustBadge: "none" as string,
      ineVerified: false,
      rfcVerified: false,
      phoneVerified: false,
    };
  }
  return {
    trustBadge: row.trust_badge ?? "none",
    ineVerified: isSellerIneVerified(row),
    rfcVerified: isSellerRfcVerified(row),
    phoneVerified: isSellerPhoneVerifiedForDisplay(row),
  };
}
