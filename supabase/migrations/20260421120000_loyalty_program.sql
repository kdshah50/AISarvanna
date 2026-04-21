-- Loyalty program: buyers earn points on each paid booking.
-- Points can be redeemed for discounts on future bookings.

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  user_id TEXT PRIMARY KEY,
  points_balance INT NOT NULL DEFAULT 0,
  points_earned_total INT NOT NULL DEFAULT 0,
  points_redeemed_total INT NOT NULL DEFAULT 0,
  booking_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.service_bookings (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire')),
  points INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_user ON public.loyalty_transactions (user_id, created_at DESC);

COMMENT ON TABLE public.loyalty_accounts IS 'Per-user loyalty points balance. 1 point = $1 MXN spent in commission.';
COMMENT ON TABLE public.loyalty_transactions IS 'Point earn/redeem history. Points are earned at 1:1 per MXN of commission paid.';
