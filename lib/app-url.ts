/**
 * Public site origin (no trailing slash). NEXT_PUBLIC_APP_URL wins when set (e.g. on Vercel).
 * Default is the apex domain naranjogo.com.mx (not www).
 */
export function getPublicAppUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "https://naranjogo.com.mx";
}
