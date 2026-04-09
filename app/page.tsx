import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";

export const dynamic = "force-dynamic";

const SUPA_URL  = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20");
const SMA_ZIP   = "37745";
const SMA_LAT   = 20.91528;
const SMA_LNG   = -100.74389;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.naranjogo.com.mx";

function fmtMXN(c: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(c / 100);
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const a = Math.sin(((lat2-lat1)*d2r)/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(((lng2-lng1)*d2r)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface Props {
  searchParams?: { q?: string; category?: string; lat?: string; lng?: string; lang?: string };
}

export default async function HomePage({ searchParams }: Props) {
  const query   = searchParams?.q ?? "";
  const lang    = searchParams?.lang ?? "es";
  const userLat = parseFloat(searchParams?.lat ?? "NaN");
  const userLng = parseFloat(searchParams?.lng ?? "NaN");
  const hasGeo  = !isNaN(userLat) && !isNaN(userLng);
  const refLat  = hasGeo ? userLat : SMA_LAT;
  const refLng  = hasGeo ? userLng : SMA_LNG;

  let cards: any[] = [];
  let searchMode = "sparse";

  try {
    if (query) {
      // ── Use hybrid search API when query present ──────────────────────────
      const params = new URLSearchParams({ q: query, category: "services" });
      if (hasGeo) { params.set("lat", String(userLat)); params.set("lng", String(userLng)); }
      const res = await fetch(`${APP_URL}/api/search?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        searchMode = data.mode ?? "sparse";
        cards = (data.results ?? []).map((row: any) => ({
          id: row.id, title: row.title_es, price_mxn: row.price_mxn,
          price_display: fmtMXN(row.price_mxn),
          category_id: row.category_id, condition: row.condition,
          location_city: row.location_city ?? "San Miguel de Allende",
          photo_url: row.photo_urls?.[0] ?? null,
          shipping_available: row.shipping_available, negotiable: row.negotiable,
          seller_name: row.users?.display_name ?? "Proveedor",
          seller_badge: row.users?.trust_badge ?? "none",
          seller_verified: false,
          _dist_km: row._dist_km ?? null,
          _mode: row._mode,
        }));
      }
    } else {
      // ── No query: show all CP 37745 services sorted by distance ───────────
      const res = await fetch(
        `${SUPA_URL}/rest/v1/listings?status=eq.active&is_verified=eq.true&category_id=eq.services`
        + `&select=id,title_es,price_mxn,category_id,condition,location_city,location_lat,location_lng,shipping_available,negotiable,photo_urls,users(display_name,trust_badge,ine_verified)`
        + `&order=created_at.desc&limit=24`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        cards = Array.isArray(data) ? data.map((row: any) => {
          const km = distKm(refLat, refLng, row.location_lat ?? SMA_LAT, row.location_lng ?? SMA_LNG);
          return {
            id: row.id, title: row.title_es, price_mxn: row.price_mxn,
            price_display: fmtMXN(row.price_mxn),
            category_id: row.category_id, condition: row.condition,
            location_city: row.location_city ?? "San Miguel de Allende",
            photo_url: row.photo_urls?.[0] ?? null,
            shipping_available: row.shipping_available, negotiable: row.negotiable,
            seller_name: row.users?.display_name ?? "Proveedor",
            seller_badge: row.users?.trust_badge ?? "none",
            seller_verified: row.users?.ine_verified ?? false,
            _dist_km: Math.round(km * 10) / 10,
          };
        }).sort((a: any, b: any) => hasGeo ? a._dist_km - b._dist_km : 0) : [];
      }
    }
  } catch (e) { console.error("Search error:", e); }

  const heading = query
    ? (lang === "en" ? `Results for "${query}"` : `Resultados para "${query}"`)
    : (lang === "en" ? "Local Services — San Miguel de Allende" : "Servicios locales — San Miguel de Allende");

  const isHybrid = searchMode === "hybrid";

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero initialQuery={query} />
      <CategoryBar activeCategory="services" />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">{heading}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {isHybrid && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                ✦ {lang === "en" ? "AI search" : "Búsqueda IA"}
              </span>
            )}
            {hasGeo && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                📍 {lang === "en" ? "Sorted by distance" : "Ordenado por distancia"}
              </span>
            )}
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              📮 CP {SMA_ZIP}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-[#F4F0EB] text-[#6B7280]">
              {cards.length} {lang === "en" ? "services" : "servicios"}
            </span>
          </div>
        </div>
        <p className="text-sm text-[#6B7280] mb-6 flex items-center gap-2">
          🏙️ San Miguel de Allende, Guanajuato
          {hasGeo && <span className="text-xs text-[#059669] font-medium">· GPS activo</span>}
        </p>
        <ListingGrid listings={cards} />
      </section>
      <TrustBar />
    </main>
  );
}
