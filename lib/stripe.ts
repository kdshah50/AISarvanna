import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  _stripe = new Stripe(key);
  return _stripe;
}

export const DEFAULT_COMMISSION_PCT = 10;

/** Stripe minimum charge for MXN is 10.00 MXN (see stripe.com/docs/currencies — minimum charge amounts). */
export const MIN_COMMISSION_CENTS_MXN = 1000;

export function computeCommissionCents(
  priceMxnCents: number,
  commissionPct: number | null | undefined
): number {
  const price = Number(priceMxnCents);
  const pct = Number(commissionPct ?? DEFAULT_COMMISSION_PCT);
  const raw = Math.round((Number.isFinite(price) ? price : 0) * (Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PCT) / 100);
  return Math.max(raw, MIN_COMMISSION_CENTS_MXN);
}
