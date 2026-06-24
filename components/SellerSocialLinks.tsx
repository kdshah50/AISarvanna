import type { Lang } from "@/lib/i18n-lang";
import {
  hasProviderSocial,
  instagramProfileUrl,
  type ProviderSocialLinks,
} from "@/lib/social-links";

export function SellerSocialLinks({
  lang,
  links,
  compact = false,
}: {
  lang: Lang;
  links: ProviderSocialLinks;
  compact?: boolean;
}) {
  if (!hasProviderSocial(links)) return null;

  const igUrl = links.instagramHandle ? instagramProfileUrl(links.instagramHandle) : null;
  const label =
    lang === "es"
      ? "También en redes"
      : lang === "hi"
        ? "सोशल पर भी"
        : lang === "gu"
          ? "સોશિયલ પર પણ"
          : "Also on social";

  const bookNote =
    lang === "es"
      ? "Reserva y paga en AISaravanna"
      : lang === "hi"
        ? "AISaravanna में बुक करें"
        : lang === "gu"
          ? "AISaravanna માં બુક કરો"
          : "Book & pay on AISaravanna";

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-2"
          : "rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3"
      }
    >
      {!compact && (
        <p className="text-xs font-semibold text-[#6B7280] mb-2 w-full">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {links.facebookUrl && (
          <a
            href={links.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/25 hover:bg-[#1877F2]/15 transition-colors"
          >
            Facebook ↗
          </a>
        )}
        {igUrl && links.instagramHandle && (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E1306C]/10 text-[#C13584] border border-[#E1306C]/25 hover:bg-[#E1306C]/15 transition-colors"
          >
            @{links.instagramHandle} ↗
          </a>
        )}
      </div>
      {!compact && (
        <p className="text-[10px] text-[#6B7280] mt-2 leading-snug">{bookNote}</p>
      )}
    </div>
  );
}
