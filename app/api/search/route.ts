import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const SMA_ZIP = "37745";

const ABS_THRESHOLD = 0.20;
const REL_FACTOR    = 0.60;

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

const SELECT_COLS = "id,title_es,price_mxn,category_id,condition,location_city"
  + ",location_lat,location_lng,shipping_available,negotiable"
  + ",photo_urls,users(display_name,trust_badge,ine_verified)";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(req.url);
  const query    = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category") ?? "services";
  const lat      = parseFloat(searchParams.get("lat") ?? "NaN");
  const lng      = parseFloat(searchParams.get("lng") ?? "NaN");
  const hasGeo   = !isNaN(lat) && !isNaN(lng);

  let sparseRows: any[] = [];
  let denseRows:  any[] = [];

  if (query) {
    // ── Layer 1: Sparse keyword search ──────────────────────────────────────
    try {
      const { data } = await supabase
        .from("listings")
        .select(SELECT_COLS)
        .eq("status", "active")
        .eq("category_id", category)
        .ilike("title_es", `%${query}%`)
        .limit(20);
      if (data) sparseRows = data;
    } catch {}

    // ── Layer 2: Dense semantic search ──────────────────────────────────────
    try {
      const vec = await embedQuery(query);
      if (vec) {
        const { data } = await supabase.rpc("search_listings_dense", {
          query_embedding: vec,
          category_filter: category,
          match_count: 20,
        });
        if (Array.isArray(data) && data.length > 0) {
          const bestScore = Math.max(...data.map((l: any) => l.similarity ?? 0));
          const threshold = Math.max(ABS_THRESHOLD, bestScore * REL_FACTOR);
          denseRows = data.filter((l: any) => (l.similarity ?? 0) >= threshold);
        }
      }
    } catch {}

  } else {
    // No query — return all active services
    try {
      const { data } = await supabase
        .from("listings")
        .select(SELECT_COLS)
        .eq("status", "active")
        .eq("category_id", category)
        .order("created_at", { ascending: false })
        .limit(24);
      if (data) sparseRows = data;
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
  const debug = { hasOpenAIKey: !!OPENAI_KEY, sparseCount: sparseRows.length, denseCount: denseRows.length, keyRole: "service_role" };

  return NextResponse.json({ results, mode, query, total: results.length, debug });
}
