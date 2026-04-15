/** Browser-only helpers for the Tianguis session cookie + JWT (HS256 from verify-otp). */

const COOKIE_NAME = "tianguis_token";

export function getTianguisTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${COOKIE_NAME}=`;
  const entry = document.cookie.split("; ").find((r) => r.startsWith(prefix));
  if (!entry) return null;
  return entry.slice(prefix.length);
}

export type TianguisJwtPayload = {
  sub?: string;
  exp?: number;
  phone?: string;
  badge?: string;
};

/** Decode JWT payload (middle segment). Handles base64url from `jose` — not plain base64. */
export function decodeJwtPayload(token: string): TianguisJwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    const json = atob(b64 + "=".repeat(pad));
    return JSON.parse(json) as TianguisJwtPayload;
  } catch {
    return null;
  }
}
