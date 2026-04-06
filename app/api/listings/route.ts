import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const SMA_ZIP = "37745";

// Absolute floor — anything below this is noise regardless of query
const ABS_THRESHOLD = 0.20;
// Relative floor — must be at least 60% of the best score
const REL_FACTOR = 0.60;

async function embedQuery(text: string): Promise<number[] | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 2000) }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

function geoBoost(km: number) {
  if (km < 2) return 2.0; if (km < 5) return 1.5; if (km < 10) return 1.2; return 1.0;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function rrf(rank: number, k = 60) { return 1 / (k + rank + 1); }

const SELECT = "id,title_es,price_mxn,category_id,condition,location_city"
  + ",location_lat,location_lng,shipping_available,negotiable"
  + ",photo_urls,users(display_name,trust_badge,ine_verified)";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query    = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category") ?? "services";
  const lat      = parseFloat(searchParams.get("lat") ?? "NaN");
  const lng      = parseFloat(searchParams.get("lng") ?? "NaN");
  const hasGeo   = !isNaN(lat) && !isNaN(lng);

  const headers = {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
  };

  let sparseRows: any[] = [];
  let denseRows:  any[] = [];

  if (query) {
    // ── Layer 1: Sparse keyword search ──────────────────────────────────────
    try {
      const r = await fetch(
        `${SUPA_URL}/rest/v1/listings?status=eq.active&category_id=eq.${category}`
        + `&title_es=ilike.*${encodeURIComponent(query)}*`
        + `&select=${SELECT}&limit=20`,
        { headers, cache: "no-store" }
      );
      if (r.ok) sparseRows = await r.json();
    } catch {}

    // ── Layer 2: Dense semantic search ──────────────────────────────────────
    try {
      const vec = await embedQuery(query);
      if (vec) {
        const r = await fetch(`${SUPA_URL}/rest/v1/rpc/search_listings_dense`, {
          method: "POST", headers,
          body: JSON.stringify({ query_embedding: vec, category_filter: category, match_count: 20 }),
          cache: "no-store",
        });
        if (r.ok) {
          const all: any[] = await r.json();
          if (Array.isArray(all) && all.length > 0) {
            // Find the best score in this result set
            const bestScore = Math.max(...all.map(l => l.similarity ?? 0));
            // Relative threshold: must be >= 60% of best score AND >= absolute floor
            const relThreshold = bestScore * REL_FACTOR;
            const threshold = Math.max(ABS_THRESHOLD, relThreshold);
            denseRows = all.filter(l => (l.similarity ?? 0) >= threshold);
          }
        }
      }
    } catch {}

  } else {
    // No query — return all SMA services
    try {
      const r = await fetch(
        `${SUPA_URL}/rest/v1/listings?status=eq.active&category_id=eq.${category}`
        + `&select=${SELECT}&order=created_at.desc&limit=24`,
        { headers, cache: "no-store" }
      );
      if (r.ok) sparseRows = await r.json();
    } catch {}
  }

  // ── RRF fusion + geo boost ─────────────────────────────────────────────────
  type Entry = { listing: any; sparse: number; dense: number; geo: number };
  const map = new Map<string, Entry>();

  sparseRows.forEach((l, i) => map.set(l.id, { listing: l, sparse: rrf(i), dense: 0, geo: 1 }));
  denseRows.forEach((l, i) => {
    const e = map.get(l.id);
    if (e) e.dense = rrf(i);
    else map.set(l.id, { listing: l, sparse: 0, dense: rrf(i), geo: 1 });
  });

  if (hasGeo) {
    map.forEach(e => {
      const { location_lat: lt, location_lng: ln } = e.listing;
      if (lt && ln) {
        const km = haversineKm(lat, lng, lt, ln);
        e.listing._dist_km = Math.round(km * 10) / 10;
        e.geo = geoBoost(km);
      }
    });
  }

  const results = Array.from(map.values())
    .map(({ listing, sparse, dense, geo }) => ({
      ...listing,
      _score: Math.round((sparse * 0.4 + dense * 0.4) * geo * 10000) / 10000,
      _mode: dense > 0 && sparse > 0 ? "hybrid" : dense > 0 ? "dense" : "sparse",
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 24);

  const mode = denseRows.length > 0 ? "hybrid" : sparseRows.length > 0 ? "sparse" : "empty";
  // Decode JWT payload to show which Supabase role is active
  let keyRole = "unknown";
  try {
    const payload = JSON.parse(Buffer.from(SUPA_KEY.split(".")[1], "base64").toString());
    keyRole = payload.role ?? "unknown";
  } catch {}
  const debug = { hasOpenAIKey: !!OPENAI_KEY, sparseCount: sparseRows.length, denseCount: denseRows.length, keyRole };

  return NextResponse.json({ results, mode, query, total: results.length, debug });
}
