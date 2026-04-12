import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

function fmtMXN(centavos: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(centavos / 100);
}

function TrustBadge({ badge }: { badge: string }) {
  const map: Record<string, { label: string; color: string; bg: string; desc: string }> = {
    diamond: { label: "Diamond",    color: "#1D4ED8", bg: "#EFF6FF", desc: "Vendedor top 10+ resenas" },
    gold:    { label: "Gold",       color: "#92400E", bg: "#FEF3C7", desc: "INE verificado" },
    bronze:  { label: "Bronze",     color: "#78350F", bg: "#FEF9EE", desc: "Telefono verificado" },
    none:    { label: "Verificado", color: "#065F46", bg: "#ECFDF5", desc: "Cuenta activa" },
  };
  const b = map[badge] ?? map.none;
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ color: b.color, background: b.bg }}>
        {b.label}
      </span>
      <span className="text-xs" style={{ color: b.color }}>{b.desc}</span>
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-[#F4F0EB] rounded-2xl p-4 text-center flex-1">
      <div className="text-2xl font-bold text-[#1B4332]">{value}</div>
      <div className="text-xs text-[#6B7280] mt-0.5">{label}</div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/users?id=eq.${params.id}&select=display_name,trust_badge`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, cache: "no-store" }
  );
  const [user] = res.ok ? await res.json() : [];
  if (!user) return { title: "Vendedor - Naranjogo" };
  return {
    title: `${user.display_name ?? "Vendedor"} - Naranjogo`,
    description: `Perfil del vendedor en Naranjogo. Badge: ${user.trust_badge ?? "none"}.`,
  };
}

export default async function SellerPage({ params }: { params: { id: string } }) {
  const h = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

  const sellerRes = await fetch(
    `${SUPA_URL}/rest/v1/users?id=eq.${params.id}&select=id,display_name,avatar_url,trust_badge,ine_verified,phone_verified,created_at`,
    { headers: h, cache: "no-store" }
  );
  const [seller] = sellerRes.ok ? await sellerRes.json() : [];
  if (!seller) notFound();

  const listingsRes = await fetch(
    `${SUPA_URL}/rest/v1/listings?seller_id=eq.${params.id}&status=eq.active&order=created_at.desc&select=id,title_es,price_mxn,category_id,condition,location_city,photo_urls,shipping_available,negotiable`,
    { headers: h, cache: "no-store" }
  );
  const listings = listingsRes.ok ? await listingsRes.json() : [];

  const soldRes = await fetch(
    `${SUPA_URL}/rest/v1/listings?seller_id=eq.${params.id}&status=eq.sold&select=id`,
    { headers: h, cache: "no-store" }
  );
  const sold = soldRes.ok ? await soldRes.json() : [];

  const memberSince = new Date(seller.created_at).getFullYear();
  const initials = (seller.display_name ?? "V").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1B4332] mb-6 transition-colors">
          Volver al inicio
        </Link>
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-8 mb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#1C1917] mb-1">{seller.display_name ?? "Vendedor"}</h1>
              <p className="text-sm text-[#6B7280] mb-3">Miembro desde {memberSince}</p>
              <TrustBadge badge={seller.trust_badge ?? "none"} />
            </div>
            <div className="flex gap-4 text-xs text-[#6B7280]">
              <span className={seller.phone_verified ? "text-[#059669]" : ""}>{seller.phone_verified ? "+" : "o"} Telefono</span>
              <span className={seller.ine_verified ? "text-[#059669]" : ""}>{seller.ine_verified ? "+" : "o"} INE</span>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <StatCard value={listings.length} label="Articulos activos" />
              <StatCard value={sold.length} label="Vendidos" />
              <StatCard value={memberSince} label="Miembro desde" />
            </div>
          </div>
        </div>

        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">shield</span>
          <div>
            <p className="text-sm font-semibold text-[#065F46]">Compra Protegida</p>
            <p className="text-xs text-[#047857]">Todos los articulos de este vendedor estan cubiertos por Compra Protegida.</p>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-xl font-bold text-[#1C1917] mb-4">
            Articulos activos <span className="ml-2 text-sm font-normal text-[#6B7280]">({listings.length})</span>
          </h2>
          {listings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]">
              <p className="text-[#6B7280]">Este vendedor no tiene articulos activos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map((listing: any) => (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E0D8] hover:shadow-lg transition-all duration-200">
                    <div className="relative aspect-[4/3] bg-[#F4F0EB]">
                      {listing.photo_urls?.[0] ? (
                        <Image src={listing.photo_urls[0]} alt={listing.title_es} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#E5E0D8]">box</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-base font-bold text-[#1C1917] mb-0.5">{fmtMXN(listing.price_mxn)}</p>
                      <p className="text-xs text-[#374151] line-clamp-2 leading-snug">{listing.title_es}</p>
                      {listing.location_city && <p className="text-[10px] text-[#9CA3AF] mt-1">{listing.location_city}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
