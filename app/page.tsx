import { Suspense } from "react";
import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";
import { HomeListHeading } from "@/components/home/HomeListHeading";
import { COLONIAS, COLONIA_RADIUS_KM, nearestColonia, coloniaLabel } from "@/lib/colonias";
import { getPublicAppUrl } from "@/lib/app-url";
import { getServiceRoleRestHeaders, getSupabaseUrl } from "@/lib/service-rest";

export const dynamic = "force-dynamic";

const SMA_ZIP   = "37745";
const SMA_LAT   = 20.91528;
const SMA_LNG   = -100.74389;
const APP_URL = getPublicAppUrl();

function fmtMXN(c: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(c / 100);
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const a = Math.sin(((lat2-lat1)*d2r)/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(((lng2-lng1)*d2r)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface Props {
  searchParams?: { q?: string; category?: string; lat?: string; lng?: string; lang?: string; colonia?: string };
}

export default async function HomePage({ searchParams }: Props) {
  const query       = searchParams?.q ?? "";
  const rawLang     = searchParams?.lang;
  const lang        = rawLang === "en" || rawLang === "es" ? rawLang : "es";
  const initialLang = lang;
  const coloniaKey  = searchParams?.colonia ?? "";
  let coloniaData   = coloniaKey ? COLONIAS[coloniaKey] : null;
  const userLat     = parseFloat(searchParams?.lat ?? "NaN");
  const userLng     = parseFloat(searchParams?.lng ?? "NaN");
  const hasGeo      = !isNaN(userLat) && !isNaN(userLng);
  const refLat      = hasGeo ? userLat : SMA_LAT;
  const refLng      = hasGeo ? userLng : SMA_LNG;

  let cards: any[] = [];
  let searchMode = "sparse";
  const supaHeaders = getServiceRoleRestHeaders();
  const supaUrl = getSupabaseUrl();

  try {
    if (query) {
      // ── Use hybrid search API when query present ──────────────────────────
      const params = new URLSearchParams({ q: query, category: "services" });
      if (hasGeo) { params.set("lat", String(userLat)); params.set("lng", String(userLng)); }
      if (coloniaKey) { params.set("colonia", coloniaKey); }
      const res = await fetch(`${APP_URL}/api/search?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        searchMode = data.mode ?? "sparse";
        const detectedColonia = data.colonia ?? null;
        cards = (data.results ?? []).map((row: any) => {
          const rLat = row.location_lat ?? SMA_LAT;
          const rLng = row.location_lng ?? SMA_LNG;
          const near = nearestColonia(rLat, rLng);
          return {
            id: row.id, title: row.title_es, price_mxn: row.price_mxn,
            price_display: fmtMXN(row.price_mxn),
            category_id: row.category_id, condition: row.condition,
            location_city: row.location_city ?? "San Miguel de Allende",
            colonia_label: near?.label ?? null,
            photo_url: row.photo_urls?.[0] ?? null,
            shipping_available: row.shipping_available, negotiable: row.negotiable,
            seller_name: row.users?.display_name ?? "Proveedor",
            seller_badge: row.users?.trust_badge ?? "none",
            seller_verified: false,
            payment_methods: row.payment_methods ?? null,
            _dist_km: row._dist_km ?? null,
            _mode: row._mode,
          };
        });
        if (detectedColonia && !coloniaData) {
          coloniaData = COLONIAS[detectedColonia.key] ?? null;
        }
      }
    } else {
      // ── No query: show all CP 37745 services sorted by distance ───────────
      const res = await fetch(
        `${supaUrl}/rest/v1/listings?status=eq.active&is_verified=eq.true&category_id=eq.services`
        + `&select=id,title_es,price_mxn,category_id,condition,location_city,location_lat,location_lng,shipping_available,negotiable,photo_urls,users!fk_listings_seller(display_name,trust_badge,ine_verified)`
        + `&order=created_at.desc&limit=24`,
        { headers: supaHeaders, cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        let rows = Array.isArray(data) ? data : [];

        if (coloniaData) {
          const cd = coloniaData;
          rows = rows.filter((row: any) => {
            const km = distKm(cd.lat, cd.lng, row.location_lat ?? SMA_LAT, row.location_lng ?? SMA_LNG);
            return km <= COLONIA_RADIUS_KM;
          });
        }

        cards = rows.map((row: any) => {
          const rLat = row.location_lat ?? SMA_LAT;
          const rLng = row.location_lng ?? SMA_LNG;
          const km = distKm(refLat, refLng, rLat, rLng);
          const near = nearestColonia(rLat, rLng);
          return {
            id: row.id, title: row.title_es, price_mxn: row.price_mxn,
            price_display: fmtMXN(row.price_mxn),
            category_id: row.category_id, condition: row.condition,
            location_city: row.location_city ?? "San Miguel de Allende",
            colonia_label: near?.label ?? null,
            photo_url: row.photo_urls?.[0] ?? null,
            shipping_available: row.shipping_available, negotiable: row.negotiable,
            seller_name: row.users?.display_name ?? "Proveedor",
            seller_badge: row.users?.trust_badge ?? "none",
            seller_verified: row.users?.ine_verified ?? false,
            payment_methods: row.payment_methods ?? null,
            _dist_km: Math.round(km * 10) / 10,
          };
        }).sort((a: any, b: any) => a._dist_km - b._dist_km);
      }
    }
  } catch (e) { console.error("Search error:", e); }

  const isHybrid = searchMode === "hybrid";

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero initialQuery={query} />
      <CategoryBar activeCategory="services" />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <Suspense
          fallback={
            <div className="h-32 mb-6 rounded-xl bg-[#F4F0EB] animate-pulse" aria-hidden />
          }
        >
          <HomeListHeading
            initialLang={initialLang}
            query={query}
            coloniaData={coloniaData}
            hasGeo={hasGeo}
            isHybrid={isHybrid}
            cardCount={cards.length}
          />
        </Suspense>
        <ListingGrid listings={cards} />
      </section>
      <TrustBar />
    </main>
  );
}
