const ZIP_FULL = /\b(\d{5})(?:-\d{4})?\b/g;

/**
 * Strip to 5-digit US postal code fragment (caller validates via geocoder).
 */
export function normalizeUsZip5(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const m = raw.match(/\b\d{5}\b/);
  return m?.[0] ?? null;
}

/**
 * Prefer the last plausible ZIP (“08854” or “Boston MA 08854”).
 * Leaves `cleanedQuery` with that occurrence removed once.
 */
export function detectZipInQuery(query: string): { zip: string; cleanedQuery: string } | null {
  const q = query.trim();
  if (q.length < 5) return null;

  let match: RegExpExecArray | null;
  ZIP_FULL.lastIndex = 0;

  /** Avoid obvious non-ZIP numeric runs (cheap guard). */
  const suspicious = /^0{5}$|^9{5}$|^1{5}$|^2{5}$/;

  let lastGood: { start: number; end: number; zip: string } | null = null;
  while ((match = ZIP_FULL.exec(q))) {
    const zip = match[1];
    if (suspicious.test(zip)) continue;
    const start = match.index ?? 0;
    const end = start + match[0].length;
    lastGood = { start, end, zip };
  }

  if (!lastGood) return null;

  const cleaned = (q.slice(0, lastGood.start) + q.slice(lastGood.end)).replace(/\s+/g, " ").trim();

  return { zip: lastGood.zip, cleanedQuery: cleaned };
}
