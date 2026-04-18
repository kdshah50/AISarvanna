import Link from "next/link";
import Image from "next/image";
import { ListingCard } from "@/lib/types";
import { WhatsAppBadgeLocked } from "@/components/WhatsAppCTA";

function fmtMXN(centavos: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function TrustBadge({ badge, verified }: { badge: string; verified: boolean }) {
  if (badge === "gold" || badge === "diamond")
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">{badge}</span>;
  if (verified)
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Verif.</span>;
  return null;
}

export default function ListingGrid({ listings }: { listings: ListingCard[] }) {
  if (!listings.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-[#6B7280] text-lg">No hay artículos que coincidan.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map(listing => (
        <Link key={listing.id} href={`/listing/${listing.id}`} className="group block">
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E0D8] hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
            <div className="relative aspect-[16/9] bg-[#F4F0EB]">
              {listing.photo_url ? (
                <Image
                  src={listing.photo_url}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#E5E0D8]">
                  📦
                </div>
              )}
              {listing.location_city && (
                <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 text-[#374151] backdrop-blur-sm">
                  📍 {listing.location_city}
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="text-lg font-bold text-[#1B4332] mb-1">
                {fmtMXN(listing.price_mxn)}
                <span className="text-xs font-semibold text-[#6B7280] ml-1">MXN</span>
                {listing.negotiable && (
                  <span className="text-xs font-normal text-[#6B7280] ml-1">· negociable</span>
                )}
              </p>
              <p className="text-sm text-[#374151] line-clamp-2 leading-snug mb-3">
                {listing.title}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                    {listing.seller_name?.[0] ?? "V"}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate max-w-[80px]">
                    {listing.seller_name}
                  </span>
                  <TrustBadge badge={listing.seller_badge} verified={listing.seller_verified} />
                </div>
                <WhatsAppBadgeLocked />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
