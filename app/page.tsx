import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";

export const dynamic = 'force-dynamic';

// Hardcoded so it always works regardless of env var availability
const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";

export default async function HomePage() {
  let cards: any[] = [];
  try {
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
             ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
             ?? "";
    const res = await fetch(
      `${SUPA_URL}/rest/v1/listings?select=id,title_es,price_mxn,category_id,condition,location_city,shipping_available,negotiable,photo_urls,users(display_name,trust_badge,ine_verified)&status=eq.active&order=created_at.desc&limit=24`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
    );
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
  } catch (e) { console.error("Listings fetch error:", e); }

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero /><CategoryBar />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Destacados</h2>
          <span className="text-sm text-[#6B7280]">{cards.length} artículos activos</span>
        </div>
        <ListingGrid listings={cards} />
      </section>
      <TrustBar />
    </main>
  );
}
