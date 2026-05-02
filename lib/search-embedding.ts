/**
 * Client-side cosine helpers for semantic search fallback when Postgres RPC
 * `search_listings_dense` is unavailable or migrations are not applied.
 */

export function parseStoredEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const nums = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    return nums.length >= 8 ? nums : null;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s.startsWith("[") || !s.endsWith("]")) return null;
    try {
      return parseStoredEmbedding(JSON.parse(s));
    } catch {
      return null;
    }
  }
  return null;
}

/** Cosine similarity in [-1, 1]; returns 0 for invalid inputs. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Map cosine to [0,1] for thresholds aligned with heuristic RPC similarities. */
export function similarityScore01(rawCosine: number): number {
  return Math.max(0, Math.min(1, (rawCosine + 1) / 2));
}
