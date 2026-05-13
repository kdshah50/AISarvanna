import type { Lang } from "@/lib/i18n-lang";

function usdFormatter(lang: Lang, whole: boolean): Intl.NumberFormat {
  const centsOpts: Intl.NumberFormatOptions = whole
    ? { style: "currency", currency: "USD", maximumFractionDigits: 0 }
    : { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 };

  switch (lang) {
    case "es":
      return new Intl.NumberFormat("es-US", centsOpts);
    case "hi": {
      try {
        return new Intl.NumberFormat("hi-IN", { ...centsOpts, numberingSystem: "deva" });
      } catch {
        return new Intl.NumberFormat("hi-IN", centsOpts);
      }
    }
    case "gu": {
      try {
        return new Intl.NumberFormat("gu-IN", { ...centsOpts, numberingSystem: "gujr" });
      } catch {
        return new Intl.NumberFormat("gu-IN", centsOpts);
      }
    }
    default:
      return new Intl.NumberFormat("en-US", centsOpts);
  }
}

/**
 * Listing `price_mxn` and package fields store amounts in **USD cents** (legacy column name).
 * Stripe `usd` Checkout uses the same cent semantics.
 */
export function formatUsdCents(cents: number, lang: Lang = "en"): string {
  return usdFormatter(lang, false).format(cents / 100);
}

/** Whole USD dollars (e.g. price filters in the URL), no cents shown. */
export function formatUsdWhole(dollars: number, lang: Lang = "en"): string {
  return usdFormatter(lang, true).format(dollars);
}
