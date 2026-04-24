/**
 * Admin PIN for /api/admin/* and similar — server env only (never NEXT_PUBLIC_*).
 * If unset, admin routes return 503 until ADMIN_PIN is configured in the host.
 */
export function getAdminPin(): string {
  return (process.env.ADMIN_PIN ?? "").trim();
}

export function isAdminPinConfigured(): boolean {
  return getAdminPin().length > 0;
}
