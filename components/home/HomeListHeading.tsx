"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ColoniaInfo } from "@/lib/colonias";
import { categoryLabel, normalizeBrowseCategory, isServiceVerticalCategory } from "@/lib/marketplace-categories";
import { langFromParam, type Lang } from "@/lib/i18n-lang";

type Props = {
  /** Must match `searchParams.lang` used on the server (first render / SSR). */
  initialLang: Lang;
  /** Must match `?category=` on first paint. */
  initialCategory?: string;
  query: string;
  coloniaData: ColoniaInfo | null;
  hasGeo: boolean;
  isHybrid: boolean;
  cardCount: number;
  /** True when county filter would hide all rows but we widened to category-wide results. */
  coloniaFilterRelaxed?: boolean;
};

/**
 * Bilingual h2 + badges for the home listing section. Client-only so the first
 * client paint matches the server: we trust `initialLang` from the server, then
 * `useSearchParams` after mount. Avoids `searchParams` vs `useSearchParams` hydration Mismatch
 * (server could see `?lang=en` while the client’s first `useSearchParams` sometimes reads as empty).
 */
export function HomeListHeading({
  initialLang,
  initialCategory = "services",
  query,
  coloniaData,
  hasGeo,
  isHybrid,
  cardCount,
  coloniaFilterRelaxed = false,
}: Props) {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [categorySlug, setCategorySlug] = useState(() => normalizeBrowseCategory(initialCategory));

  useEffect(() => {
    setLang(langFromParam(params.get("lang")));
  }, [params]);

  useEffect(() => {
    setCategorySlug(normalizeBrowseCategory(params.get("category")));
  }, [params]);

  const catWord = categoryLabel(categorySlug, lang);
  const isServiceVertical = isServiceVerticalCategory(categorySlug);
  const placeLabel = coloniaData
    ? lang === "en"
      ? coloniaData.label_en
      : coloniaData.label
    : "";

  const heading =
    query && coloniaData
      ? lang === "en"
        ? `"${query}" in ${placeLabel}`
        : `"${query}" en ${placeLabel}`
      : query
        ? lang === "en"
          ? `Results for "${query}"`
          : `Resultados para "${query}"`
        : coloniaData
          ? lang === "en"
            ? `${catWord} in ${placeLabel}`
            : `${catWord} en ${placeLabel}`
          : lang === "en"
            ? isServiceVertical
              ? "Local Services — New Jersey"
              : `${catWord} — New Jersey`
            : isServiceVertical
              ? "Servicios locales — Nueva Jersey"
              : `${catWord} — Nueva Jersey`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-bold text-[#1C1917]">{heading}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {isHybrid && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
              ✦ {lang === "en" ? "AI search" : "Búsqueda IA"}
            </span>
          )}
          {hasGeo && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              📍 {lang === "en" ? "Sorted by distance" : "Ordenado por distancia"}
            </span>
          )}
          {coloniaData && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FDE68A] text-[#78350F] border border-[#F59E0B]">
              📍 {placeLabel}
            </span>
          )}
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F4F0EB] text-[#6B7280] border border-[#E5E0D8]">
            {lang === "en" ? "New Jersey" : "Nueva Jersey"}
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-[#F4F0EB] text-[#6B7280]">
            {cardCount}{" "}
            {lang === "en" ? (isServiceVertical ? "services" : "listings") : isServiceVertical ? "servicios" : "anuncios"}
          </span>
        </div>
      </div>
      <p className="text-sm text-[#6B7280] mb-6 flex items-center gap-2">
        🏙️ {lang === "en" ? "New Jersey, USA" : "Nueva Jersey, EE. UU."}
        {hasGeo && (
          <span className="text-xs text-[#059669] font-medium">
            · {lang === "en" ? "Location on" : "GPS activo"}
          </span>
        )}
      </p>
      {coloniaFilterRelaxed && cardCount > 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          {lang === "en"
            ? "No listings sat within the county radius from the map center — showing all matches in this category across New Jersey instead."
            : "Ningún anuncio quedó dentro del radio del condado — mostramos todos los de esta categoría en Nueva Jersey."}
        </p>
      )}
    </div>
  );
}
