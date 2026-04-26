/**
 * Cart checkout uses Stripe Connect only when MARKETPLACE_CONNECT_REQUIRED is explicitly enabled.
 * If unset/false: full cart total is charged to the platform Stripe account (no seller Connect).
 * Set MARKETPLACE_CONNECT_REQUIRED=true when Connect is configured and sellers onboard.
 */
export function marketplaceConnectRequired(): boolean {
  const v = process.env.MARKETPLACE_CONNECT_REQUIRED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}
