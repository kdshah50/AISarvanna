import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("listings")
    .select("title_es, description_es, photo_urls, price_mxn")
    .eq("id", params.id)
    .single();
  if (!data) return { title: "Artículo no encontrado — Tianguis" };
  const price = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(data.price_mxn / 100);
  return {
    title: `${data.title_es} — ${price} | Tianguis`,
    description: data.description_es?.slice(0, 160) ?? `${data.title_es} en venta en Tianguis`,
    openGraph: {
      title: data.title_es,
      description: data.description_es ?? "",
      images: data.photo_urls?.[0] ? [{ url: data.photo_urls[0], width: 800, height: 600 }] : [],
    },
  };
}

function TrustBadge({ badge }: { badge: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    diamond: { label: "💎 Diamond", color: "#1D4ED8", bg: "#EFF6FF" },
    gold:    { label: "🥇 Gold",    color: "#92400E", bg: "#FEF3C7" },
    bronze:  { label: "🥉 Bronze",  color: "#92400E", bg: "#FEF9EE" },
    none:    { label: "✓ Verificado", color: "#065F46", bg: "#ECFDF5" },
  };
  const b = map[badge] ?? map.none;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: b.color, background: b.bg }}>
      {b.label}
    </span>
  );
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: listing } = await supabase
    .from("listings")
    .select(`*, users ( id, display_name, avatar_url, trust_badge, ine_verified, phone, whatsapp_optin, created_at )`)
    .eq("id", params.id)
    .eq("status", "active")
    .single();

  if (!listing) notFound();

  supabase.rpc("increment_view_count", { listing_id: params.id }).then(() => {});

  const price = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(listing.price_mxn / 100);
  const seller = listing.users as any;

  // Build WhatsApp URL
  const waPhone = seller?.phone?.replace(/\D/g, "") ?? "";
  const waText = encodeURIComponent(`Hola! Vi tu anuncio en Tianguis: "${listing.title_es}" (${price}). ¿Sigue disponible?`);
  const waUrl = `https://wa.me/${waPhone || "521"}?text=${waText}`;
  const showWA = seller?.whatsapp_optin !== false;

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Photo */}
        {listing.photo_urls?.[0] && (
          <img src={listing.photo_urls[0]} alt={listing.title_es}
            className="w-full h-80 object-cover rounded-2xl mb-6" />
        )}

        {/* Price + title */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl font-bold text-[#1B4332]">{price}</span>
          {listing.negotiable && <span className="text-sm text-[#6B7280] italic">Negociable</span>}
        </div>
        <h1 className="text-xl font-semibold text-[#1C1917] mb-4">{listing.title_es}</h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {listing.shipping_available && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">📦 Envío disponible</span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F4F0EB] text-[#6B7280]">{listing.condition}</span>
          {listing.location_city && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F4F0EB] text-[#6B7280]">📍 {listing.location_city}</span>
          )}
        </div>

        {/* Description */}
        {listing.description_es && (
          <p className="text-[#374151] leading-relaxed mb-6">{listing.description_es}</p>
        )}

        {/* Seller card — with trust badge */}
        {seller && (
          <div className="bg-[#F4F0EB] rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {seller.display_name?.[0] ?? "V"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{seller.display_name ?? "Vendedor"}</span>
                <TrustBadge badge={seller.trust_badge ?? "none"} />
              </div>
              <span className="text-xs text-[#6B7280]">
                Miembro desde {new Date(seller.created_at).getFullYear()}
              </span>
            </div>
          </div>
        )}

        {/* Buyer protection */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Compra Protegida</p>
            <p className="text-xs text-emerald-700">Tu pago está protegido hasta confirmar tu compra</p>
          </div>
        </div>

        {/* CTAs — WhatsApp + regular contact */}
        <div className="flex flex-col gap-3">
          {showWA && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
              style={{ background: "#25D366", color: "white" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contactar por WhatsApp
            </a>
          )}
          <button className="w-full py-4 rounded-xl bg-[#1B4332] text-white font-semibold text-base hover:bg-[#2D6A4F] transition-colors">
            Contactar vendedor
          </button>
        </div>

      </div>
    </main>
  );
}
