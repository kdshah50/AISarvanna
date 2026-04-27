-- Marketplace cart checkout (non-service categories) + Stripe Connect destination charges.
-- Run in Supabase SQL editor or via CLI.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

COMMENT ON COLUMN public.users.stripe_connect_account_id IS
  'Stripe Connect Express account id (acct_...) for marketplace payouts.';

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
  vat_cents INTEGER NOT NULL CHECK (vat_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  application_fee_cents INTEGER NOT NULL CHECK (application_fee_cents >= 0),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON public.marketplace_orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON public.marketplace_orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_session ON public.marketplace_orders (stripe_checkout_session_id);

COMMENT ON TABLE public.marketplace_orders IS
  'Paid cart checkouts for goods (non-service); funds split via Stripe Connect application_fee.';
