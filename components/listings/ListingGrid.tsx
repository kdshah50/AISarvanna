"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingCard } from "@/lib/types";
import { WhatsAppBadgeLocked } from "@/components/WhatsAppCTA";
import { SellerVerificationBadges } from "@/components/SellerVerificationBadges";
import { DEFAULT_LANG, langFromParam, type Lang } from "@/lib/i18n-lang";
import { formatUsdCents } from "@/lib/money";

type Props = {
  listings: ListingCard[];
  /** Must match `?lang=` on first paint; then synced from the URL on the client. */
  initialLang?: Lang;
};

export default function ListingGrid({ listings, initialLang = DEFAULT_LANG }: Props) {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    setLang(langFromParam(params.get("lang")));
  }, [params]);

  if (!listings.length) {
    const category = (params.get("category") ?? "services").toLowerCase();
    const colonia = params.get("colonia")?.trim() ?? "";

    let emptyMsg: string;
    let hint: string | null = null;

    if (lang === "en") {
      emptyMsg =
        category === "services"
          ? "No verified services to show yet."
          : "No matching listings.";
      if (category === "services") {
        hint =
          "AISaravanna only shows service listings after admin approval (is_verified = true in Supabase, or via your /admin flow). New sign-ups from /unete start as pending. If you chose a county filter, listings must fall within that county’s area—try opening the homepage without a county chip or clear ?colonia= in the URL. For local development, add SHOW_PENDING_SERVICES=true to .env.local and restart npm run dev to also list pending services.";
      }
    } else {
      emptyMsg =
        category === "services"
          ? "Aún no hay servicios verificados para mostrar."
          : "No hay artículos que coincidan.";
      if (category === "services") {
        hint =
          "AISaravanna solo muestra servicios aprobados (is_verified = true en Supabase, o desde /admin). Los registros en /unete quedan pendientes. Si filtraste por condado, los anuncios deben caer en esa zona—prueba sin condado o quita ?colonia= de la URL. En local, añade SHOW_PENDING_SERVICES=true a .env.local y reinicia npm run dev para ver también servicios pendientes.";
      }
    }

    return (
      <div className="text-center py-16 max-w-lg mx-auto px-4">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-[#374151] text-lg font-medium">{emptyMsg}</p>
        {hint && (
          <p className="text-[#6B7280] text-sm mt-4 leading-relaxed text-left bg-[#F4F0EB] rounded-xl p-4 border border-[#E5E0D8]">
            {hint}
          </p>
        )}
      </div>
    );
  }

  const negotiableHint = lang === "en" ? "· negotiable" : "· negociable";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((listing) => (
        <Link
          key={listing.id}
          href={lang === "es" ? `/listing/${listing.id}?lang=es` : `/listing/${listing.id}`}
          className="group block"
        >
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
              {(listing.colonia_label || listing.location_city) && (
                <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 text-[#374151] backdrop-blur-sm">
                  📍 {listing.colonia_label ?? listing.location_city}
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="text-lg font-bold text-[#1B4332] mb-1">
                {listing.price_display ?? formatUsdCents(listing.price_mxn, lang)}
                {listing.negotiable && (
                  <span className="text-xs font-normal text-[#6B7280] ml-1">{negotiableHint}</span>
                )}
              </p>
              <p className="text-sm text-[#374151] line-clamp-2 leading-snug mb-3">{listing.title}</p>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                    {listing.seller_name?.[0] ?? "V"}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate max-w-[10rem]">
                    {listing.seller_name}
                  </span>
                  <SellerVerificationBadges
                    trustBadge={listing.seller_badge}
                    ineVerified={listing.seller_ine_verified}
                    rfcVerified={listing.seller_rfc_verified}
                    phoneVerified={listing.seller_phone_verified}
                    platformListingVerified={Boolean(listing.listing_admin_verified)}
                    lang={lang}
                    size="sm"
                  />
                </div>
                <div className="flex-shrink-0 self-center">
                  <WhatsAppBadgeLocked />
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
