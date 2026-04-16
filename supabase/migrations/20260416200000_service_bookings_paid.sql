-- Paid service bookings: buyer pays commission fee before getting provider contact info.
-- Follows Uber-like model: chat in-app → pay commission → receive contact.

CREATE TABLE IF NOT EXISTS public.service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,

  -- Commission snapshot at booking time
  commission_amount_cents INT NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,

  -- Stripe payment tracking
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,

  -- Contact reveal (snapshot of seller phone at payment time)
  seller_phone_snapshot TEXT,
  contact_revealed_at TIMESTAMPTZ,

  -- Booking details
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_listing ON public.service_bookings (listing_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_buyer ON public.service_bookings (buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_seller ON public.service_bookings (seller_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_stripe ON public.service_bookings (stripe_checkout_session_id);

COMMENT ON TABLE public.service_bookings IS 'Paid service bookings: buyer pays commission to unlock provider contact. APIs use service role.';
