"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COLONIAS, COLONIA_KEYS } from "@/lib/colonias";

const T = {
  es: {
    badge: "CP 37745 • SERVICIOS",
    line1: "eCommerce",
    line2: "con Confianza",
    sub: "Servicios locales verificados en código postal 37745.",
    placeholder: "Busca un servicio... ej. plomero, dentista",
    btn: "Buscar",
    near: "Cerca de mí",
    zipNote: "Búsqueda limitada a CP 37745",
  },
  en: {
    badge: "ZIP 37745 • SERVICES",
    line1: "eCommerce",
    line2: "with Confidence",
    sub: "Verified local services in ZIP code 37745.",
    placeholder: "Search a service... e.g. plumber, dentist",
    btn: "Search",
    near: "Near me",
    zipNote: "Search limited to ZIP 37745",
  },
};

function HeroInner({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [geoLoading, setGeoLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const lang = (params.get("lang") || "es") as "es" | "en";
  const t = T[lang];
  const activeColonia = params.get("colonia") ?? "";

  const go = (q: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(params.toString());
    p.set("category", "services"); // always locked to Services
    if (q.trim()) p.set("q", q.trim()); else p.delete("q");
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    router.push(`/?${p.toString()}`);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoLoading(false);
        go(query, { lat: coords.latitude.toFixed(6), lng: coords.longitude.toFixed(6), colonia: "" });
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  const handleColonia = (key: string) => {
    const isActive = activeColonia === key;
    if (isActive) {
      go(query, { colonia: "" });
    } else {
      const c = COLONIAS[key];
      go(query, { colonia: key, lat: String(c.lat), lng: String(c.lng) });
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332] py-16 px-4 overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#D4A017]/10 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="inline-block bg-[#D4A017]/20 rounded-full px-4 py-1.5 mb-4">
          <span className="text-[#F0C040] text-xs font-bold tracking-widest">✦ {t.badge}</span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-3">
          {t.line1}<br />{t.line2}
        </h1>
        <p className="text-white/70 text-base mb-6">{t.sub}</p>

        {/* Search bar */}
        <div className="bg-white rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl mb-3">
          <span className="text-lg pl-3">🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && go(query)}
            placeholder={t.placeholder}
            className="flex-1 bg-transparent text-[#1C1917] placeholder-[#A8A095] outline-none text-base py-2"
          />
          <button
            onClick={() => go(query)}
            className="bg-[#1B4332] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#2D6A4F] transition-colors whitespace-nowrap"
          >
            {t.btn}
          </button>
        </div>

        {/* Near me */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
          <button
            onClick={handleNearMe}
            disabled={geoLoading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-60 transition-all"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            {geoLoading
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Localizando...</>
              : <>📍 {t.near}</>
            }
          </button>
        </div>

        {/* Colonia chips */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {COLONIA_KEYS.map((key) => {
            const c = COLONIAS[key];
            const active = activeColonia === key;
            return (
              <button
                key={key}
                onClick={() => handleColonia(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#D4A017] text-[#1B4332] shadow-md"
                    : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/20"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Hero({ initialQuery = "" }: { initialQuery?: string }) {
  return (
    <Suspense fallback={<div className="bg-[#1B4332] py-16 h-64" />}>
      <HeroInner initialQuery={initialQuery} />
    </Suspense>
  );
}
