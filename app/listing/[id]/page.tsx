import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ListingChat from "@/components/ListingChat";
import ServiceBookingBlock from "@/components/ServiceBookingBlock";
import WhatsAppCTA from "@/components/WhatsAppCTA";
import SellerReviews, { RatingSummary } from "@/components/SellerReviews";
import ReportButton from "@/components/ReportButton";
import GuaranteeBadge from "@/components/GuaranteeBadge";
import FavoriteButton from "@/components/FavoriteButton";
import { isServicesListing } from "@/lib/listing-category";
import { PAYMENT_METHODS_MX } from "@/lib/types";
import { getServiceRoleRestHeaders, getSupabaseUrl } from "@/lib/service-rest";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supaUrl = getSupabaseUrl();
  const h = getServiceRoleRestHeaders();
  const res = await fetch(`${supaUrl}/rest/v1/listings?id=eq.${params.id}&select=title_es,description_es,photo_urls,price_mxn`, {
    headers: h,
    cache: "no-store",
  });
  const [data] = res.ok ? await res.json() : [];
  if (!data) return { title: "Artículo no encontrado - Naranjogo" };

  const price = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(data.price_mxn / 100);
  return {
    title: `${data.title_es} - ${price} | Naranjogo`,
    description: data.description_es?.slice(0, 160) ?? `${data.title_es} en venta en Naranjogo`,
    openGraph: {
      title: data.title_es,
      description: data.description_es ?? "",
      images: data.photo_urls?.[0] ? [{ url: data.photo_urls[0], width: 800, height: 600 }] : [],
    },
  };
}

function TrustBadge({ badge }: { badge: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    diamond: { label: "Diamond", color: "#1D4ED8", bg: "#EFF6FF" },
    gold: { label: "Gold", color: "#92400E", bg: "#FEF3C7" },
    bronze: { label: "Bronze", color: "#92400E", bg: "#FEF9EE" },
    none: { label: "Verificado", color: "#065F46", bg: "#ECFDF5" },
  };

  const b = map[badge] ?? map.none;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: b.color, background: b.bg }}>
      {b.label}
    </span>
  );
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { chat?: string };
}) {
  const supaUrl = getSupabaseUrl();
  const h = { ...getServiceRoleRestHeaders(), "Content-Type": "application/json" };
  const res = await fetch(
    `${supaUrl}/rest/v1/listings?id=eq.${params.id}&status=eq.active&select=*,users!fk_listings_seller(id,display_name,avatar_url,trust_badge,ine_verified,whatsapp_optin,created_at)`,
    { headers: h, cache: "no-store" }
  );
  const [listing] = res.ok ? await res.json() : [];
  if (!listing) notFound();

  fetch(`${supaUrl}/rest/v1/rpc/increment_view_count`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ listing_id: params.id }),
  }).catch(() => {});

  const sellerId = listing.seller_id ?? (listing.users as any)?.id;

  let reviewCount = 0;
  let avgRating = 0;
  if (sellerId) {
    const revRes = await fetch(
      `${supaUrl}/rest/v1/seller_reviews?seller_id=eq.${sellerId}&select=rating`,
      { headers: h, cache: "no-store" }
    );
    const revRows: { rating: number }[] = revRes.ok ? await revRes.json() : [];
    reviewCount = revRows.length;
    avgRating =
      reviewCount > 0
        ? Math.round((revRows.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
        : 0;
  }

  const price = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(listing.price_mxn / 100);
  const seller = listing.users as any;
  const isServiceListing = isServicesListing(listing);

  return (
    <main className="min-h-screen bg-[#FDF8F1]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {listing.photo_urls?.[0] && <img src={listing.photo_urls[0]} alt={listing.title_es} className="w-full h-80 object-cover rounded-2xl mb-6" />}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl font-bold text-[#1B4332]">
            {price}
            <span className="text-base font-semibold text-[#6B7280] ml-2">MXN</span>
          </span>
          {listing.negotiable && <span className="text-sm text-[#6B7280] italic">Negociable</span>}
        </div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-xl font-semibold text-[#1C1917] flex-1 min-w-0">{listing.title_es}</h1>
          <FavoriteButton listingId={params.id} />
        </div>
        {isServiceListing && listing.package_session_count >= 2 && listing.package_total_price_mxn > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Approved package:</strong> {listing.package_session_count} sessions for{" "}
            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
              listing.package_total_price_mxn / 100
            )}{" "}
            total (platform fee is calculated on this amount when you book).
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-6">
          {listing.shipping_available && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Envio disponible</span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F4F0EB] text-[#6B7280]">{listing.condition}</span>
          {listing.location_city && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F4F0EB] text-[#6B7280]">{listing.location_city}</span>
          )}
        </div>
        {/* WhatsApp CTA — hero button, always visible */}
        {isServiceListing && (
          <div className="mb-6">
            <WhatsAppCTA listingId={params.id} isService={isServiceListing} />
            <p className="text-center text-xs text-[#6B7280] mt-2">
              Platica primero, paga la tarifa y recibe el WhatsApp del proveedor
            </p>
          </div>
        )}

        {listing.description_es && <p className="text-[#374151] leading-relaxed mb-6">{listing.description_es}</p>}

        {/* Payment methods section — hidden until commission collection is enabled via Stripe */}

        {seller && (
          <Link href={`/seller/${seller.id}`} className="block hover:opacity-90 transition-opacity">
            <div className="bg-[#F4F0EB] rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {seller.display_name?.[0] ?? "V"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{seller.display_name ?? "Vendedor"}</span>
                  <TrustBadge badge={seller.trust_badge ?? "none"} />
                  {reviewCount > 0 && <RatingSummary average={avgRating} total={reviewCount} />}
                </div>
                <span className="text-xs text-[#6B7280]">Miembro desde {new Date(seller.created_at).getFullYear()}</span>
              </div>
            </div>
          </Link>
        )}
        <div className="flex flex-col gap-3">
          <ListingChat listingId={params.id} initialConversationId={searchParams?.chat} />
          <div id="booking-section">
            <ServiceBookingBlock
              listingId={params.id}
              isService={isServiceListing}
              sellerId={listing.seller_id ?? null}
            />
          </div>
        </div>

        {isServiceListing && (
          <div className="mt-6">
            <GuaranteeBadge />
          </div>
        )}

        {sellerId && (
          <div className="mt-8">
            <h2 className="font-serif text-xl font-bold text-[#1C1917] mb-4">
              Reseñas del vendedor
              {reviewCount > 0 && <span className="ml-2 text-sm font-normal text-[#6B7280]">({reviewCount})</span>}
            </h2>
            <SellerReviews sellerId={sellerId} />
          </div>
        )}

        {/* Report */}
        <div className="mt-8 pt-6 border-t border-[#E5E0D8] flex justify-center">
          <ReportButton listingId={params.id} sellerId={sellerId} />
        </div>
      </div>
    </main>
  );
}
