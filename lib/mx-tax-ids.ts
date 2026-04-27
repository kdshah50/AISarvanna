/**
 * Normalize Mexican tax IDs for storage (human / admin review — not SAT validation).
 */

/** CURP: 18 chars alphanumeric. */
export function normalizeCurpForStorage(raw: string): string | undefined {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "").slice(0, 18);
  return s.length > 0 ? s : undefined;
}

/**
 * RFC: persona física 13 chars, persona moral 12 — we cap at 13 after stripping junk.
 * Allows letters, digits, Ñ (normalized to N for storage consistency with common entry).
 */
export function normalizeRfcForStorage(raw: string): string | undefined {
  let s = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/Ñ/g, "N");
  s = s.replace(/[^A-Z0-9]/g, "").slice(0, 13);
  return s.length > 0 ? s : undefined;
}
