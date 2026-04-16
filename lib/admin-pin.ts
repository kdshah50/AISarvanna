/**
 * Admin PIN for /api/admin/* — read at request time on the server.
 * Set `ADMIN_PIN` in Vercel (recommended) or `NEXT_PUBLIC_ADMIN_PIN`.
 *
 * Important: In Vercel, an empty `ADMIN_PIN` is still `""`, and `"" ?? fallback` does NOT
 * fall through — so we treat empty/whitespace as "unset" and use the next source.
 */
export function getAdminPin(): string {
  const fromAdmin = (process.env.ADMIN_PIN ?? "").trim();
  const fromPublic = (process.env.NEXT_PUBLIC_ADMIN_PIN ?? "").trim();
  if (fromAdmin) return fromAdmin;
  if (fromPublic) return fromPublic;
  return "naranjogo2026";
}
