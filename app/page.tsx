import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";

export const dynamic = "force-dynamic";

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

function fmtMXN(centavos: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(centavos / 100);
}

interface Props {
  searchParams?: {
    q?: string;
    category?: string;
    lat?: string;
    lng?: string;
    lang?: string;
  };
}

export default async function HomePage({ searchParams }: Props) {
  const query    = searchParams?.q ?? "";
  const category = searchParams?.category ?? "services"; // always default to services
  const lat      = searchParams?.lat ?? "";
  const lng      = searchParams?.lng ?? "";

  let cards: any[] = [];

  try {
    // Always filter to services category only
    let url = `${SUPA_URL}/rest/v1/listings?status=eq.active&category_id=eq.services` +
      `&select=id,title_es,price_mxn,category_id,condition,location_city,shipping_available,negotiable,photo_urls,users(display_name,trust_badge,ine_verified)` +
      `&order=created_at.desc&limit=24`;

    // Text search filter
    if (query) {
      url += `&title_es=ilike.*${encodeURIComponent(query)}*`;
    }

    const res = await fetch(url, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      cards = Array.isArray(data) ? data.map((row: any) => ({
        id:                 row.id,
        title:              row.title_es,
        price_mxn:          row.price_mxn,
        price_display:      fmtMXN(row.price_mxn),
        category_id:        row.category_id,
        condition:          row.condition,
        location_city:      row.location_city,
        photo_url:          row.photo_urls?.[0] ?? null,
        shipping_available: row.shipping_available,
        negotiable:         row.negotiable,
        seller_name:        row.users?.display_name ?? "Vendedor",
        seller_badge:       row.users?.trust_badge ?? "none",
        seller_verified:    row.users?.ine_verified ?? false,
      })) : [];
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }

  const isGeo = !!(lat && lng);
  const lang = searchParams?.lang ?? "es";
  const heading = query
    ? (lang === "en" ? `Results for "${query}"` : `Resultados para "${query}"`)
    : (lang === "en" ? "Local Services" : "Servicios locales");

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero initialQuery={query} />
      <CategoryBar activeCategory="services" />

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">{heading}</h2>
          <div className="flex items-center gap-2">
            {isGeo && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46]">
                📍 {lang === "en" ? "Sorted by distance" : "Ordenado por distancia"}
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">
              CP 37745
            </span>
            <span className="text-sm text-[#6B7280]">{cards.length} {lang === "en" ? "services" : "servicios"}</span>
          </div>
        </div>
        <ListingGrid listings={cards} />
      </section>

      <TrustBar />
    </main>
  );
}
