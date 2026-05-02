import { headers } from "next/headers";

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

/**
 * Origin for server-side `fetch()` to routes on **this** deployment.
 * Prefer the incoming Host (so `npm run dev` hits localhost:3006 even when NEXT_PUBLIC_APP_URL is production).
 * Call only from a Server Component / Route Handler / Server Action within a request.
 */
export function getServerFetchOrigin(): string {
  try {
    const h = headers();
    const rawHost = h.get("x-forwarded-host") ?? h.get("host");
    const host = rawHost?.split(",")[0]?.trim();
    if (host) {
      const hostLower = host.toLowerCase();
      const isLocal =
        hostLower.startsWith("localhost") ||
        hostLower.startsWith("127.0.0.1") ||
        hostLower.startsWith("[::1]");
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* outside request scope */
  }

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3006";
    return `http://127.0.0.1:${port}`;
  }

  return getPublicAppUrl();
}
