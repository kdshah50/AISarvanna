/**
 * Turn free-text search (EN/ES) into structured hints: price caps/floors + cleaner keyword/embedding strings.
 * Used by /api/search — LLM when OPENAI_API_KEY is set, else regex heuristics.
 *
 * Prices are **USD**: whole dollars in NLP output, stored/filtered as **USD cents** (same as `listings.price_mxn`).
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const CHAT_MODEL = process.env.SEARCH_PARSE_MODEL ?? "gpt-4o-mini";

export type ParsedQueryFilters = {
  maxPriceCents?: number;
  minPriceCents?: number;
  /** Short phrase for title ilike (no price junk). */
  keywordForSparse: string;
  /** Fuller line for embedding similarity. */
  textForEmbedding: string;
  source: "llm" | "regex" | "none";
};

function wholeUsdToCents(wholeUsd: number): number {
  if (!Number.isFinite(wholeUsd) || wholeUsd < 0) return 0;
  return Math.round(wholeUsd * 100);
}

function parseNumber(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Regex extraction: "under $50", "less than 200 dollars", "max 900", "hasta 100".
 * Strips matched segments from the query for keyword search.
 * All monetary amounts are treated as **USD** (whole dollars) for this US marketplace.
 */
export function regexParseSearchQuery(input: string): ParsedQueryFilters {
  let rest = input.trim();
  let maxUsd: number | undefined;
  let minUsd: number | undefined;

  const priceClause =
    /\b(under|below|less\s+than|menos\s+de|hasta|máximo|maximo|max|at\s+most|por\s+menos\s+de)\s*\$?\s*([\d,.]+)\s*(usd|us\s*\$|dollars?|dlls?|mxn|mx\$|pesos?)?\b/gi;
  const priceClauseMin =
    /\b(over|above|more\s+than|más\s+de|al\s+menos|min|minimum|at\s+least|desde)\s*\$?\s*([\d,.]+)\s*(usd|us\s*\$|dollars?|dlls?|mxn|mx\$|pesos?)?\b/gi;
  const priceLessNumber = /\b<\s*\$?\s*([\d,.]+)\s*(usd|mxn|pesos?)?\b/gi;

  const applyMax = (amount: number) => {
    if (!Number.isFinite(amount)) return;
    maxUsd = maxUsd === undefined ? amount : Math.min(maxUsd, amount);
  };

  const applyMin = (amount: number) => {
    if (!Number.isFinite(amount)) return;
    minUsd = minUsd === undefined ? amount : Math.max(minUsd, amount);
  };

  rest = rest.replace(priceClause, (_, _op, num) => {
    const amount = parseNumber(num);
    if (!Number.isNaN(amount)) applyMax(amount);
    return " ";
  });
  rest = rest.replace(priceClauseMin, (_, _op, num) => {
    const amount = parseNumber(num);
    if (!Number.isNaN(amount)) applyMin(amount);
    return " ";
  });
  rest = rest.replace(priceLessNumber, (_, num) => {
    const amount = parseNumber(num);
    if (!Number.isNaN(amount)) applyMax(amount);
    return " ";
  });

  const keywordForSparse = rest.replace(/\s+/g, " ").trim() || input.trim();
  const textForEmbedding = keywordForSparse.trim() ? keywordForSparse.trim() : input.trim();

  const out: ParsedQueryFilters = {
    keywordForSparse,
    textForEmbedding,
    source: maxUsd !== undefined || minUsd !== undefined ? "regex" : "none",
  };
  if (maxUsd !== undefined) out.maxPriceCents = wholeUsdToCents(maxUsd);
  if (minUsd !== undefined) out.minPriceCents = wholeUsdToCents(minUsd);
  return out;
}

type LlmExtract = {
  keyword_phrase?: string | null;
  semantic_query?: string | null;
  max_price_usd?: number | null;
  min_price_usd?: number | null;
};

async function llmParseSearchQuery(query: string, category: string): Promise<ParsedQueryFilters | null> {
  if (!OPENAI_KEY || !query.trim()) return null;

  const system = `You extract search filters for a US local marketplace (bilingual English/Spanish listings).
Return ONLY valid JSON with keys:
- keyword_phrase: short phrase for SQL ILIKE on listing title (English and/or Spanish; omit price words).
- semantic_query: one natural sentence for vector search ONLY about service/item/intent — **omit** price caps like "under $200" unless the numeric budget is central to semantics.
- max_price_usd: maximum price in whole US dollars (integer), or null if not stated.
- min_price_usd: minimum price in whole US dollars (integer), or null if not stated.

Rules:
- All prices are US dollars. "Under $50" or "under 50 dollars" → max_price_usd = 50.
- "Under 500 pesos" in a US context still treat as dollars if no conversion is explicit (use 500).
- Ignore availability words like "today", "now", "urgent" for price (leave price null unless a number is given).
- category hint (for context only): ${category}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: query.slice(0, 2000) },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw || typeof raw !== "string") return null;

    let parsed: LlmExtract;
    try {
      parsed = JSON.parse(raw) as LlmExtract;
    } catch {
      return null;
    }

    const keyword =
      typeof parsed.keyword_phrase === "string" && parsed.keyword_phrase.trim()
        ? parsed.keyword_phrase.trim()
        : query.trim();
    const semantic =
      typeof parsed.semantic_query === "string" && parsed.semantic_query.trim()
        ? parsed.semantic_query.trim()
        : query.trim();

    const out: ParsedQueryFilters = {
      keywordForSparse: keyword,
      textForEmbedding: semantic,
      source: "llm",
    };

    if (parsed.max_price_usd != null && Number.isFinite(Number(parsed.max_price_usd))) {
      out.maxPriceCents = wholeUsdToCents(Math.floor(Number(parsed.max_price_usd)));
    }
    if (parsed.min_price_usd != null && Number.isFinite(Number(parsed.min_price_usd))) {
      out.minPriceCents = wholeUsdToCents(Math.ceil(Number(parsed.min_price_usd)));
    }

    return out;
  } catch {
    return null;
  }
}

/** Stopwords stripped from sparse search tokens (Spanish + English). */
const SPARSE_TOKEN_STOPWORDS = new Set([
  "the", "and", "with", "for", "from", "that", "this", "are", "your", "you", "not", "per", "any",
  "need", "want", "looking",
  "los", "las", "unos", "unas", "por", "con", "que", "una", "del", "al", "como",
]);

function escIlike(fragment: string): string {
  return `*${fragment.replace(/\\/g, "").replace(/\*/g, "").trim()}*`;
}

/**
 * PostgREST `or`/`and` clause for multilingual sparse search: multi-token queries require
 * every significant token to hit somewhere on title/description (not one contiguous substring).
 *
 * Matches "personal trainer" against title_en "Personal trainer …" + Spanish "... personal ...".
 */
export function postgrestSparseKeywordClause(sparsePhrase: string): {
  dimension: "or" | "and";
  clause: string;
} | null {
  const trimmed = sparsePhrase.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-záéíóúüñ0-9-]/gi, ""))
    .filter((t) => t.length >= 3 && !SPARSE_TOKEN_STOPWORDS.has(t));
  const unique = [...new Set(tokens)].slice(0, 8);

  const fields = ["title_es", "title_en", "description_es", "description_en"] as const;

  if (unique.length === 0) {
    const safe = trimmed.replace(/[*%,()]/g, "").trim();
    if (!safe) return null;
    const pat = escIlike(safe);
    const tuple = fields.map((f) => `${f}.ilike.${pat}`).join(",");
    return { dimension: "or", clause: `(${tuple})` };
  }

  if (unique.length === 1) {
    const pat = escIlike(unique[0]);
    const tuple = fields.map((f) => `${f}.ilike.${pat}`).join(",");
    return { dimension: "or", clause: `(${tuple})` };
  }

  const parts = unique.map((tok) => {
    const pat = escIlike(tok);
    const tuple = fields.map((f) => `${f}.ilike.${pat}`).join(",");
    return `or(${tuple})`;
  });
  return { dimension: "and", clause: `(${parts.join(",")})` };
}

/** Merge LLM + regex: regex can fill price if LLM omitted; prefer LLM keyword/semantic when present. */
export async function parseSearchQuery(query: string, category: string): Promise<ParsedQueryFilters> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { keywordForSparse: "", textForEmbedding: "", source: "none" };
  }

  const rx = regexParseSearchQuery(trimmed);
  const llm = await llmParseSearchQuery(trimmed, category);

  if (!llm) {
    return rx.source === "none" ? { ...rx, keywordForSparse: trimmed, textForEmbedding: trimmed } : rx;
  }

  const merged: ParsedQueryFilters = {
    keywordForSparse: llm.keywordForSparse || trimmed,
    textForEmbedding: llm.textForEmbedding || trimmed,
    source: "llm",
    maxPriceCents: llm.maxPriceCents ?? rx.maxPriceCents,
    minPriceCents: llm.minPriceCents ?? rx.minPriceCents,
  };

  if (merged.maxPriceCents != null && rx.maxPriceCents != null) {
    merged.maxPriceCents = Math.min(merged.maxPriceCents, rx.maxPriceCents);
  }
  if (merged.minPriceCents != null && rx.minPriceCents != null) {
    merged.minPriceCents = Math.max(merged.minPriceCents, rx.minPriceCents);
  }
  if (merged.maxPriceCents == null) merged.maxPriceCents = rx.maxPriceCents;
  if (merged.minPriceCents == null) merged.minPriceCents = rx.minPriceCents;

  return merged;
}

export function listingMatchesPriceFilters(
  priceCents: number | null | undefined,
  f: Pick<ParsedQueryFilters, "maxPriceCents" | "minPriceCents">
): boolean {
  if (priceCents == null || !Number.isFinite(Number(priceCents))) return true;
  const p = Number(priceCents);
  if (f.maxPriceCents != null && p > f.maxPriceCents) return false;
  if (f.minPriceCents != null && p < f.minPriceCents) return false;
  return true;
}
