/**
 * HS256 secret for tianguis_token. In production JWT_SECRET is required (≥32 chars).
 * Development falls back to a fixed dev secret so local runs work without .env.
 */
export function getJwtSecretBytes(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim();
  if (s && s.length >= 32) {
    return new TextEncoder().encode(s);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to at least 32 characters in production");
  }
  return new TextEncoder().encode("tianguis_dev_secret_change_in_production");
}
