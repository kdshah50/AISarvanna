"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  { id: "services",    icon: "🔧", label: { es: "Servicios",    en: "Services"    }, active: true  },
  { id: "electronics", icon: "📱", label: { es: "Electrónica",  en: "Electronics" }, active: false },
  { id: "vehicles",    icon: "🚗", label: { es: "Vehículos",    en: "Vehicles"    }, active: false },
  { id: "fashion",     icon: "👗", label: { es: "Moda",         en: "Fashion"     }, active: false },
  { id: "home",        icon: "🏠", label: { es: "Hogar",        en: "Home"        }, active: false },
  { id: "realestate",  icon: "🏡", label: { es: "Bienes Raíces",en: "Real Estate" }, active: false },
  { id: "sports",      icon: "⚽", label: { es: "Deportes",     en: "Sports"      }, active: false },
];

function CategoryBarInner() {
  const params = useSearchParams();
  const lang = (params.get("lang") || "es") as "es" | "en";

  return (
    <div className="bg-white border-b border-[#E5E0D8] sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
        <div className="flex gap-1 py-3 min-w-max items-center">
          {CATEGORIES.map(cat => {
            const isServices = cat.id === "services";
            return (
              <div key={cat.id} className="relative group">
                <button
                  disabled={!isServices}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isServices
                      ? "bg-[#1B4332] text-white cursor-pointer"
                      : "bg-[#F4F0EB] text-[#C5C0B8] cursor-not-allowed opacity-50"
                  }`}
                >
                  <span className={isServices ? "" : "grayscale opacity-50"} style={{ fontSize: 16 }}>
                    {cat.icon}
                  </span>
                  {cat.label[lang]}
                  {!isServices && (
                    <span className="text-[9px] font-bold ml-1 px-1 py-0.5 rounded bg-[#E5E0D8] text-[#A8A095]">
                      Próximo
                    </span>
                  )}
                </button>
                {/* Tooltip on hover for greyed categories */}
                {!isServices && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-[#1C1917] text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {lang === "es" ? "Próximamente" : "Coming soon"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CategoryBar({ activeCategory }: { activeCategory?: string }) {
  return (
    <Suspense fallback={<div className="bg-white border-b border-[#E5E0D8] h-14" />}>
      <CategoryBarInner />
    </Suspense>
  );
}
