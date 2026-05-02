import { Suspense } from "react";
import ListingBrowseSection from "@/components/listings/ListingBrowseSection";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";
import { HomeListHeading } from "@/components/home/HomeListHeading";
import {
  CountyServiceCatalogSection,
  type CountyServiceCatalogRow,
} from "@/components/home/CountyServiceCatalogSection";
import { COLONIAS, COLONIA_RADIUS_KM, nearestColonia } from "@/lib/colonias";
import { getPublicAppUrl } from "@/lib/app-url";
import { getServiceRoleRestHeaders, getSupabaseUrl } from "@/lib/service-rest";
import {
  embeddedSellerRow,
  isSellerPhoneVerifiedForDisplay,
} from "@/lib/seller-trust-display";
import { normalizeBrowseCategory } from "@/lib/marketplace-categories";
import { postgrestActiveListingVerificationFragment } from "@/lib/browse-listings-filters";
import { langFromParam } from "@/lib/i18n-lang";
import { listingTitle } from "@/lib/listing-language";
import { formatUsdCents } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Default map / fallback coordinates: geographic center of New Jersey */
const NJ_LAT = 40.0583;
const NJ_LNG = -74.4057;
const APP_URL = getPublicAppUrl();

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const a = Math.sin(((lat2-lat1)*d2r)/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(((lng2-lng1)*d2r)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/** Hero `pmin` / `pmax`: whole US dollars (applied as USD cents on `price_mxn`). */
function parseWholeUsd(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

interface Props {
  searchParams?: {
    q?: string;
    category?: string;
    lat?: string;
    lng?: string;
    lang?: string;
    colonia?: string;
    pmin?: string;
    pmax?: string;
  };
}

export default async function HomePage({ searchParams }: Props) {
  const categorySlug = normalizeBrowseCategory(searchParams?.category);
  const query       = searchParams?.q ?? "";
  const lang        = langFromParam(searchParams?.lang);
  const initialLang = lang;
  const coloniaKey  = searchParams?.colonia ?? "";
  const pminUsd     = parseWholeUsd(searchParams?.pmin);
  const pmaxUsd     = parseWholeUsd(searchParams?.pmax);
  let coloniaData   = coloniaKey ? COLONIAS[coloniaKey] : null;
  const userLat     = parseFloat(searchParams?.lat ?? "NaN");
  const userLng     = parseFloat(searchParams?.lng ?? "NaN");
  const hasGeo      = !isNaN(userLat) && !isNaN(userLng);
  const refLat      = hasGeo ? userLat : NJ_LAT;
  const refLng      = hasGeo ? userLng : NJ_LNG;

  let cards: any[] = [];
  let searchMode = "sparse";
  let countyCatalog: CountyServiceCatalogRow[] = [];
  /** County radius hid all rows but category had matches — we widened to full category results. */
  let coloniaFilterRelaxed = false;

  try {
    const supaHeaders = getServiceRoleRestHeaders();
    const supaUrl = getSupabaseUrl();

    if (categorySlug === "services" && coloniaKey && coloniaKey !== "otro") {
      try {
        const catPath =
          `/rest/v1/county_service_catalog?county_key=eq.${encodeURIComponent(coloniaKey)}&active=eq.true` +
          `&select=service_slug,label_en,label_es,blurb_en,blurb_es,strategy_tag&order=sort_order.asc`;
        const catRes = await fetch(`${supaUrl}${catPath}`, { headers: supaHeaders, cache: "no-store" });
        if (catRes.ok) {
          const raw = await catRes.json();
          if (Array.isArray(raw)) countyCatalog = raw as CountyServiceCatalogRow[];
        }
      } catch {
        /* catalog is optional until migration is applied */
      }
    }

    if (query) {
      // ── Use hybrid search API when query present ──────────────────────────
      const params = new URLSearchParams({ q: query, category: categorySlug });
      if (hasGeo) { params.set("lat", String(userLat)); params.set("lng", String(userLng)); }
      if (coloniaKey) { params.set("colonia", coloniaKey); }
      if (pminUsd != null && pminUsd > 0) params.set("pmin", String(pminUsd));
      if (pmaxUsd != null && pmaxUsd > 0) params.set("pmax", String(pmaxUsd));
      const res = await fetch(`${APP_URL}/api/search?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        searchMode = data.mode ?? "sparse";
        if (data.colonia_relaxed === true) coloniaFilterRelaxed = true;
        const detectedColonia = data.colonia ?? null;
        cards = (data.results ?? []).map((row: any) => {
          const rLat = row.location_lat ?? NJ_LAT;
          const rLng = row.location_lng ?? NJ_LNG;
          const near = nearestColonia(rLat, rLng, undefined, lang);
          const u = embeddedSellerRow(row.users) as {
            display_name?: string | null;
            trust_badge?: string | null;
            ine_verified?: boolean | null;
            rfc_verified?: boolean | null;
            phone_verified?: boolean | null;
          } | null;
          return {
            id: row.id,
            title: listingTitle(row, lang),
            price_mxn: row.price_mxn,
            price_display: formatUsdCents(row.price_mxn, lang),
            category_id: row.category_id, condition: row.condition,
            location_city: row.location_city ?? "New Jersey",
            colonia_label: near?.label ?? null,
            photo_url: row.photo_urls?.[0] ?? null,
            location_lat: row.location_lat ?? null,
            location_lng: row.location_lng ?? null,
            shipping_available: row.shipping_available, negotiable: row.negotiable,
            seller_name: u?.display_name ?? "Proveedor",
            seller_badge: u?.trust_badge ?? "none",
            seller_ine_verified: Boolean(u?.ine_verified),
            seller_rfc_verified: Boolean(u?.rfc_verified),
            seller_phone_verified: isSellerPhoneVerifiedForDisplay(u),
            listing_admin_verified: Boolean(row.is_verified),
            payment_methods: row.payment_methods ?? null,
            _dist_km: row._dist_km ?? null,
            _mode: row._mode,
          };
        });
        if (detectedColonia && !coloniaData) {
          coloniaData = COLONIAS[detectedColonia.key] ?? null;
        }
      } else {
        const msg = await res.text().catch(() => "");
        console.error("[home] /api/search", res.status, msg.slice(0, 500));
      }
    } else {
      // ── No query: show active listings for selected category (verified-only, or + pending services in dev) ───────
      let browsePath =
        `/rest/v1/listings?${postgrestActiveListingVerificationFragment(categorySlug)}&category_id=eq.${categorySlug}`
        + `&select=id,title_es,title_en,price_mxn,category_id,condition,location_city,location_lat,location_lng,shipping_available,negotiable,photo_urls,users!fk_listings_seller(display_name,trust_badge,ine_verified,rfc_verified,phone_verified)`
        + `&order=created_at.desc&limit=24`;
      if (pminUsd != null && pminUsd > 0) browsePath += `&price_mxn=gte.${pminUsd * 100}`;
      if (pmaxUsd != null && pmaxUsd > 0) browsePath += `&price_mxn=lte.${pmaxUsd * 100}`;
      const res = await fetch(`${supaUrl}${browsePath}`, { headers: supaHeaders, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        let rows = Array.isArray(data) ? data : [];

        if (coloniaData) {
          const cd = coloniaData;
          const filtered = rows.filter((row: any) => {
            const km = distKm(cd.lat, cd.lng, row.location_lat ?? NJ_LAT, row.location_lng ?? NJ_LNG);
            return km <= COLONIA_RADIUS_KM;
          });
          if (filtered.length > 0) {
            rows = filtered;
          } else if (rows.length > 0) {
            coloniaFilterRelaxed = true;
          }
        }

        cards = rows.map((row: any) => {
          const rLat = row.location_lat ?? NJ_LAT;
          const rLng = row.location_lng ?? NJ_LNG;
          const km = distKm(refLat, refLng, rLat, rLng);
          const near = nearestColonia(rLat, rLng, undefined, lang);
          const u = embeddedSellerRow(row.users) as {
            display_name?: string | null;
            trust_badge?: string | null;
            ine_verified?: boolean | null;
            rfc_verified?: boolean | null;
            phone_verified?: boolean | null;
          } | null;
          return {
            id: row.id,
            title: listingTitle(row, lang),
            price_mxn: row.price_mxn,
            price_display: formatUsdCents(row.price_mxn, lang),
            category_id: row.category_id, condition: row.condition,
            location_city: row.location_city ?? "New Jersey",
            colonia_label: near?.label ?? null,
            photo_url: row.photo_urls?.[0] ?? null,
            location_lat: row.location_lat ?? null,
            location_lng: row.location_lng ?? null,
            shipping_available: row.shipping_available, negotiable: row.negotiable,
            seller_name: u?.display_name ?? "Proveedor",
            seller_badge: u?.trust_badge ?? "none",
            seller_ine_verified: Boolean(u?.ine_verified),
            seller_rfc_verified: Boolean(u?.rfc_verified),
            seller_phone_verified: isSellerPhoneVerifiedForDisplay(u),
            listing_admin_verified: Boolean(row.is_verified),
            payment_methods: row.payment_methods ?? null,
            _dist_km: Math.round(km * 10) / 10,
          };
        }).sort((a: any, b: any) => a._dist_km - b._dist_km);
      } else {
        const msg = await res.text().catch(() => "");
        console.error("[home] listings REST", res.status, msg.slice(0, 800));
      }
    }
  } catch (e) { console.error("Search error:", e); }

  const isHybrid = searchMode === "hybrid";

  const devMissingSupabase =
    process.env.NODE_ENV === "development" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const devPendingServices =
    process.env.NODE_ENV === "development" && process.env.SHOW_PENDING_SERVICES === "true";

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <CategoryBar />
      <Hero initialQuery={query} />
      {devMissingSupabase && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Local setup:</strong> Add <code className="text-xs">.env.local</code> with{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> (see <code className="text-xs">.env.example</code>
            ). Then run <code className="text-xs">npm run dev</code> — not <code className="text-xs">npm dev</code>.
          </div>
        </div>
      )}
      {devPendingServices && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <strong>Dev only:</strong> <code className="text-xs">SHOW_PENDING_SERVICES=true</code> — listings in{" "}
            <strong>service</strong> categories (Beauty, Childcare, Tutoring, etc.) may include <em>unverified</em> rows.
            Production still requires admin verification.
          </div>
        </div>
      )}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <Suspense
          fallback={
            <div className="h-32 mb-6 rounded-xl bg-[#F4F0EB] animate-pulse" aria-hidden />
          }
        >
          {categorySlug === "services" && coloniaKey && coloniaKey !== "otro" && (
            <CountyServiceCatalogSection lang={lang} countyKey={coloniaKey} items={countyCatalog} />
          )}
          <HomeListHeading
            initialLang={initialLang}
            initialCategory={categorySlug}
            query={query}
            coloniaData={coloniaData}
            hasGeo={hasGeo}
            isHybrid={isHybrid}
            cardCount={cards.length}
            coloniaFilterRelaxed={coloniaFilterRelaxed}
          />
        </Suspense>
        <ListingBrowseSection
          listings={cards}
          initialLang={initialLang}
          mapCenterLat={refLat}
          mapCenterLng={refLng}
          isDev={process.env.NODE_ENV === "development"}
          devPendingServicesEnabled={devPendingServices}
        />
      </section>
      <TrustBar />
    </main>
  );
}
