const DEFAULT = "https://aisaravanna.com";

/**
 * Public site origin (no trailing slash). NEXT_PUBLIC_APP_URL wins when set (e.g. on Vercel).
 * Default is the AISaravanna apex (override with NEXT_PUBLIC_APP_URL in production).
 * Tolerates values missing `https://` or malformed URLs so `metadataBase` in layout never throws.
 */
export function getPublicAppUrl(): string {
  let u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!u) return DEFAULT;
  u = u.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    new URL(u);
    return u;
  } catch {
    return DEFAULT;
  }
}
