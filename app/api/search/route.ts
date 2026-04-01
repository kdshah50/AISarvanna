import { NextRequest, NextResponse } from "next/server";

const SUPA_URL  = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";
const FASTAPI   = process.env.FASTAPI_INTERNAL_URL ?? "https://naranjogo3-production.up.railway.app";
const SECRET    = "tianguis_secret_2026";
const SMA_ZIP   = "37745";

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${FASTAPI}/ml/embed-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": SECRET },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()).vector ?? null;
  } catch { return null; }
}

function geoBoost(km: number) {
  if (km < 2)  return 2.0;
  if (km < 5)  return 1.5;
  if (km < 10) return 1.2;
  return 1.0;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2-lat1)*d2r, dLng = (lng2-lng1)*d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function rrf(rank: number, k = 60) { return 1 / (k + rank + 1); }

const SELECT = "id,title_es,price_mxn,category_id,condition,location_city,location_lat,location_lng,photo_urls,shipping_available,negotiable,users(display_name,trust_badge)";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query    = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category") ?? "services";
  const lat      = parseFloat(searchParams.get("lat") ?? "NaN");
  const lng      = parseFloat(searchParams.get("lng") ?? "NaN");
  const hasGeo   = !isNaN(lat) && !isNaN(lng);

  const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

  // ── Layer 1: Sparse BM25 keyword search ─────────────────────────────────
  let sparseRows: any[] = [];
  if (query) {
    const url = `${SUPA_URL}/rest/v1/listings?status=eq.active&category_id=eq.${category}&zip_code=eq.${SMA_ZIP}`
      + `&title_es=ilike.*${encodeURIComponent(query)}*&select=${SELECT}&limit=30`;
    const r = await fetch(url, { headers, cache: "no-store" });
    if (r.ok) sparseRows = await r.json();
  }

  // ── Layer 2: Dense semantic search via pgvector ──────────────────────────
  let denseRows: any[] = [];
  if (query) {
    const vec = await embedQuery(query);
    if (vec) {
      const r = await fetch(`${SUPA_URL}/rest/v1/rpc/search_listings_dense`, {
        method: "POST", headers,
        body: JSON.stringify({ query_embedding: vec, category_filter: category, match_count: 30 }),
        cache: "no-store",
      });
      if (r.ok) {
        const all = await r.json();
        // Filter to CP 37745 only
        denseRows = Array.isArray(all) ? all.filter((l: any) => !l.zip_code || l.zip_code === SMA_ZIP) : [];
      }
    }
  }

  // Fallback: no query — return all services in CP 37745
  if (!query) {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/listings?status=eq.active&category_id=eq.${category}&zip_code=eq.${SMA_ZIP}&select=${SELECT}&order=created_at.desc&limit=24`,
      { headers, cache: "no-store" }
    );
    if (r.ok) sparseRows = await r.json();
  }

  // ── Layer 3 + RRF Fusion ─────────────────────────────────────────────────
  type Entry = { listing: any; sparse: number; dense: number; geo: number };
  const map = new Map<string, Entry>();

  sparseRows.forEach((l, i) => map.set(l.id, { listing: l, sparse: rrf(i), dense: 0, geo: 1 }));
  denseRows.forEach((l, i) => {
    const e = map.get(l.id);
    if (e) e.dense = rrf(i);
    else map.set(l.id, { listing: l, sparse: 0, dense: rrf(i), geo: 1 });
  });

  // Apply geo boost
  const SMA_LAT = 20.91528, SMA_LNG = -100.74389;
  const refLat = hasGeo ? lat : SMA_LAT;
  const refLng = hasGeo ? lng : SMA_LNG;

  map.forEach((e) => {
    const lt = e.listing.location_lat ?? SMA_LAT;
    const ln = e.listing.location_lng ?? SMA_LNG;
    const km = haversineKm(refLat, refLng, lt, ln);
    e.listing._dist_km = Math.round(km * 10) / 10;
    e.geo = geoBoost(km);
  });

  const results = Array.from(map.values())
    .map(({ listing, sparse, dense, geo }) => ({
      ...listing,
      _score: Math.round((sparse * 0.4 + dense * 0.4) * geo * 10000) / 10000,
      _mode:  dense > 0 && sparse > 0 ? "hybrid" : dense > 0 ? "dense" : "sparse",
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 24);

  const mode = denseRows.length > 0 ? "hybrid" : "sparse";
  return NextResponse.json({ results, mode, query, total: results.length });
}
