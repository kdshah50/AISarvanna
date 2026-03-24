import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";

export const dynamic = 'force-dynamic';

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

interface Props { searchParams?: { q?: string; category?: string } }

export default async function HomePage({ searchParams }: Props) {
  const query = searchParams?.q ?? "";
  const category = searchParams?.category ?? "";
  let cards: any[] = [];

  try {
    let url = `${SUPA_URL}/rest/v1/listings?select=id,title_es,price_mxn,category_id,condition,location_city,shipping_available,negotiable,photo_urls,users(display_name,trust_badge,ine_verified)&status=eq.active&order=created_at.desc&limit=24`;
    if (category && category !== "all") url += `&category_id=eq.${category}`;
    if (query) url += `&title_es=ilike.*${encodeURIComponent(query)}*`;

    const res = await fetch(url, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      cards = Array.isArray(data) ? data.map((row: any) => ({
        id: row.id, title: row.title_es, price_mxn: row.price_mxn,
        category_id: row.category_id, condition: row.condition,
        location_city: row.location_city, photo_url: row.photo_urls?.[0] ?? null,
        shipping_available: row.shipping_available, negotiable: row.negotiable,
        seller_name: row.users?.display_name ?? "Vendedor",
        seller_badge: row.users?.trust_badge ?? "none",
        seller_verified: row.users?.ine_verified ?? false,
      })) : [];
    }
  } catch (e) { console.error("Fetch error:", e); }

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero initialQuery={query} />
      <CategoryBar activeCategory={category} />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
            {query ? `Resultados para "${query}"` : "Destacados"}
          </h2>
          <span className="text-sm text-[#6B7280]">{cards.length} artículos activos</span>
        </div>
        <ListingGrid listings={cards} />
      </section>
      <TrustBar />
    </main>
  );
}
