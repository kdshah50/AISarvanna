import Link from "next/link";
import { coloniaLabel } from "@/lib/colonias";
import type { Lang } from "@/lib/i18n-lang";

export type CountyServiceCatalogRow = {
  service_slug: string;
  label_en: string;
  label_es: string;
  blurb_en: string;
  blurb_es: string;
  strategy_tag: string | null;
};

function chipHref(
  countyKey: string,
  slug: string,
  lang: Lang,
): string {
  const q = slug.replace(/_/g, " ");
  const p = new URLSearchParams({
    category: "services",
    colonia: countyKey,
    q,
  });
  if (lang === "es") p.set("lang", "es");
  return `/?${p.toString()}`;
}

const TAG_HINT: Record<string, { en: string; es: string }> = {
  recurring: { en: "Repeat service", es: "Servicio recurrente" },
  high_ticket: { en: "High-trust", es: "Alto valor" },
  trust: { en: "Verified quality", es: "Calidad verificada" },
  ai_concierge: { en: "AI booking fit", es: "Ideal para IA / reservas" },
};

export function CountyServiceCatalogSection({
  lang,
  countyKey,
  items,
}: {
  lang: Lang;
  countyKey: string;
  items: CountyServiceCatalogRow[];
}) {
  if (items.length === 0) return null;

  const countyName = coloniaLabel(countyKey, lang);
  const title =
    lang === "en"
      ? `Service focus in ${countyName}`
      : `Enfoque de servicios en ${countyName}`;
  const intro =
    lang === "en"
      ? "Curated categories we’re prioritizing for verified providers and AI-assisted booking — tap to run a search."
      : "Categorías priorizadas para proveedores verificados y reservas asistidas por IA — toca para buscar.";

  return (
    <div className="mb-8 rounded-2xl border border-[#E5E0D8] bg-white/90 px-4 py-4 shadow-sm">
      <h3 className="font-serif text-lg font-bold text-[#1C1917]">{title}</h3>
      <p className="text-xs text-[#6B7280] mt-1 mb-3 max-w-3xl">{intro}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((row) => {
          const label = lang === "en" ? row.label_en : row.label_es;
          const blurb = lang === "en" ? row.blurb_en : row.blurb_es;
          const tag = row.strategy_tag?.trim();
          const tagL =
            tag && TAG_HINT[tag] ? TAG_HINT[tag][lang] : null;
          return (
            <li key={row.service_slug}>
              <Link
                href={chipHref(countyKey, row.service_slug, lang)}
                title={blurb || label}
                className="inline-flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border border-[#D4A017]/40 bg-[#FFFBF0] text-left text-sm font-semibold text-[#1B4332] hover:bg-[#FFF5DC] transition-colors max-w-[14rem]"
              >
                <span className="leading-tight">{label}</span>
                {tagL && (
                  <span className="text-[10px] font-medium text-[#78350F]/90">{tagL}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
