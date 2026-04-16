/**
 * Admin PIN for /api/admin/* — read at request time on the server.
 * Set `ADMIN_PIN` in Vercel (recommended; not sent to the browser) or `NEXT_PUBLIC_ADMIN_PIN`.
 */
export function getAdminPin(): string {
  return (process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "naranjogo2026").trim();
}
