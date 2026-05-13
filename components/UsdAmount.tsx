import type { Lang } from "@/lib/i18n-lang";
import { formatUsdCents, formatUsdWhole } from "@/lib/money";

const wrapClass = "notranslate whitespace-nowrap";

type Props = { lang: Lang; className?: string };

/** USD cents — localized digits for hi/gu; excluded from machine translation wrappers. */
export function UsdCents({ cents, lang, className }: Props & { cents: number }) {
  return (
    <span translate="no" className={className ? `${wrapClass} ${className}` : wrapClass} suppressHydrationWarning>
      {formatUsdCents(cents, lang)}
    </span>
  );
}

/** Whole USD amounts (slider, filters). */
export function UsdWhole({ dollars, lang, className }: Props & { dollars: number }) {
  return (
    <span translate="no" className={className ? `${wrapClass} ${className}` : wrapClass} suppressHydrationWarning>
      {formatUsdWhole(dollars, lang)}
    </span>
  );
}
