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

export function computeCommissionCents(
  priceMxnCents: number,
  commissionPct: number | null | undefined
): number {
  const pct = commissionPct ?? DEFAULT_COMMISSION_PCT;
  return Math.max(Math.round(priceMxnCents * pct / 100), 500); // minimum $5 MXN
}
