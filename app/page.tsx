import { createClient } from "@supabase/supabase-js";
import ListingGrid from "@/components/listings/ListingGrid";
import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import TrustBar from "@/components/TrustBar";

// Use service role for server-side reads — bypasses RLS so all active listings show
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const revalidate = 60; // re-fetch from DB every 60 seconds

export default async function HomePage() {
  const supabase = getAdminClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      id, title_es, price_mxn, category_id, condition,
      location_city, shipping_available, negotiable,
      photo_urls, created_at,
      users ( display_name, trust_badge, ine_verified )
    `)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) console.error("DB error:", error.message);

  const cards = (listings || []).map((row: any) => ({
    id: row.id,
    title: row.title_es,
    price_mxn: row.price_mxn,
    category_id: row.category_id,
    condition: row.condition,
    location_city: row.location_city,
    photo_url: row.photo_urls?.[0] ?? null,
    shipping_available: row.shipping_available,
    negotiable: row.negotiable,
    seller_name: row.users?.display_name ?? "Vendedor",
    seller_badge: row.users?.trust_badge ?? "none",
    seller_verified: row.users?.ine_verified ?? false,
  }));

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <Hero />
      <CategoryBar />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
            Destacados
          </h2>
          <span className="text-sm text-[#6B7280]">
            {cards.length} artículos activos
          </span>
        </div>
        <ListingGrid listings={cards} />
      </section>
      <TrustBar />
    </main>
  );
}
