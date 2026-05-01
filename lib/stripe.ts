import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Use fetch-based HTTP client — avoids "connection to Stripe... retried twice" on Vercel/serverless
 * where the default Node http(s) agent can be flaky (see stripe/stripe-node#2523).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !key.startsWith("sk_")) {
    throw new Error("Missing or invalid STRIPE_SECRET_KEY (must start with sk_)");
  }
  _stripe = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 60_000,
    maxNetworkRetries: 4,
    appInfo: { name: "AISaravanna", version: "1.0.0" },
  });
  return _stripe;
}

export const DEFAULT_COMMISSION_PCT = 10;

/** Minimum platform commission in USD cents ($10.00). */
export const MIN_COMMISSION_CENTS_USD = 1000;

/** @deprecated use MIN_COMMISSION_CENTS_USD — same value; Stripe currency is `usd`. */
export const MIN_COMMISSION_CENTS_MXN = MIN_COMMISSION_CENTS_USD;

/** Checkout Session / webhook may return PaymentIntent as id string or expanded object. */
export function stripePaymentIntentId(
  pi: string | Stripe.PaymentIntent | null | undefined
): string | null {
  if (pi == null) return null;
  if (typeof pi === "string") return pi;
  if (typeof pi === "object" && "id" in pi && typeof (pi as { id: unknown }).id === "string") {
    return (pi as { id: string }).id;
  }
  return null;
}

export function computeCommissionCents(
  priceMxnCents: number,
  commissionPct: number | null | undefined
): number {
  const price = Number(priceMxnCents);
  const pct = Number(commissionPct ?? DEFAULT_COMMISSION_PCT);
  const raw = Math.round((Number.isFinite(price) ? price : 0) * (Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PCT) / 100);
  return Math.max(raw, MIN_COMMISSION_CENTS_USD);
}
