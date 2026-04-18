import Link from "next/link";
import Image from "next/image";
import { ListingCard } from "@/lib/types";

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

function waUrl(phone: string, title: string, price: string) {
  const clean = phone.replace(/[^0-9]/g, "");
  if (!clean) return null;
  const text = encodeURIComponent(
    `Hola! Me interesa tu servicio en Naranjogo: "${title}" (${price}). ¿Está disponible?`
  );
  return `https://wa.me/${clean}?text=${text}`;
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
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
      {listings.map(listing => {
        const price = fmtMXN(listing.price_mxn);
        const wa = listing.seller_phone ? waUrl(listing.seller_phone, listing.title, price) : null;
        return (
          <div key={listing.id} className="bg-white rounded-2xl overflow-hidden border border-[#E5E0D8] hover:shadow-lg transition-all duration-200">
            <Link href={`/listing/${listing.id}`} className="block">
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
                  {price}
                  <span className="text-xs font-semibold text-[#6B7280] ml-1">MXN</span>
                  {listing.negotiable && (
                    <span className="text-xs font-normal text-[#6B7280] ml-1">· negociable</span>
                  )}
                </p>
                <p className="text-sm text-[#374151] line-clamp-2 leading-snug mb-3">
                  {listing.title}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                    {listing.seller_name?.[0] ?? "V"}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate">
                    {listing.seller_name}
                  </span>
                  <TrustBadge badge={listing.seller_badge} verified={listing.seller_verified} />
                </div>
              </div>
            </Link>

            <div className="px-4 pb-4">
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors hover:brightness-110"
                  style={{ background: "#25D366", color: "white" }}
                >
                  <WhatsAppIcon size={16} />
                  Chatear por WhatsApp
                </a>
              ) : (
                <Link
                  href={`/listing/${listing.id}`}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-[#1B4332] text-white transition-colors hover:bg-[#2D5A44]"
                >
                  Ver detalles
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
