import type { Lang } from "@/lib/i18n-lang";

/**
 * Listing `price_mxn` and package fields store amounts in **USD cents** (legacy column name).
 * Stripe `usd` Checkout uses the same cent semantics.
 */
export function formatUsdCents(cents: number, lang: Lang = "en"): string {
  const locale = lang === "es" ? "es-US" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Whole USD dollars (e.g. price filters in the URL), no cents shown. */
export function formatUsdWhole(dollars: number, lang: Lang = "en"): string {
  const locale = lang === "es" ? "es-US" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}
