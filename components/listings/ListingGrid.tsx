"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingCard } from "@/lib/types";
import { WhatsAppBadgeLocked } from "@/components/WhatsAppCTA";

type Lang = "en" | "es";

function fmtMXN(centavos: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function TrustBadge({
  badge,
  ineVerified,
  phoneVerified,
  lang,
}: {
  badge: string;
  ineVerified: boolean;
  phoneVerified: boolean;
  lang: Lang;
}) {
  if (badge === "gold" || badge === "diamond")
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">{badge}</span>;
  if (ineVerified) {
    const ineTitle = lang === "en" ? "Government ID reviewed (INE)" : "INE revisada";
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800" title={ineTitle}>
        INE
      </span>
    );
  }
  if (phoneVerified) {
    const phoneTitle =
      lang === "en" ? "Phone number verified (WhatsApp)" : "Número verificado (WhatsApp)";
    const phoneLabel = lang === "en" ? "Telephone" : "Teléfono";
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/90 whitespace-nowrap shrink-0"
        title={phoneTitle}
      >
        <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
        {phoneLabel}
      </span>
    );
  }
  return null;
}

type Props = {
  listings: ListingCard[];
  /** Must match `?lang=` on first paint; then synced from the URL on the client. */
  initialLang?: Lang;
};

export default function ListingGrid({ listings, initialLang = "es" }: Props) {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    const p = (params.get("lang") || "es") as string;
    if (p === "en" || p === "es") setLang(p);
  }, [params]);

  if (!listings.length) {
    const emptyMsg = lang === "en" ? "No matching listings." : "No hay artículos que coincidan.";
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-[#6B7280] text-lg">{emptyMsg}</p>
      </div>
    );
  }

  const negotiableHint = lang === "en" ? "· negotiable" : "· negociable";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((listing) => (
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
              {(listing.colonia_label || listing.location_city) && (
                <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 text-[#374151] backdrop-blur-sm">
                  📍 {listing.colonia_label ?? listing.location_city}
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="text-lg font-bold text-[#1B4332] mb-1">
                {fmtMXN(listing.price_mxn)}
                <span className="text-xs font-semibold text-[#6B7280] ml-1">MXN</span>
                {listing.negotiable && (
                  <span className="text-xs font-normal text-[#6B7280] ml-1">{negotiableHint}</span>
                )}
              </p>
              <p className="text-sm text-[#374151] line-clamp-2 leading-snug mb-3">{listing.title}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                    {listing.seller_name?.[0] ?? "V"}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate max-w-[80px]">
                    {listing.seller_name}
                  </span>
                  <TrustBadge
                    badge={listing.seller_badge}
                    ineVerified={listing.seller_ine_verified}
                    phoneVerified={listing.seller_phone_verified}
                    lang={lang}
                  />
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
