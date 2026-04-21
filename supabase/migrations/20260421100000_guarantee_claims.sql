-- Garantía NaranjoGo: claims / disputes for on-platform bookings.
-- Buyers can file a claim if the provider no-shows or delivers poor work.

CREATE TABLE IF NOT EXISTS public.guarantee_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.service_bookings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN (
    'no_show', 'poor_quality', 'incomplete', 'overcharged', 'safety_issue', 'other'
  )),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 3000),

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'approved', 'denied', 'refunded'
  )),
  admin_note TEXT,
  refund_amount_cents INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT one_claim_per_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_guarantee_claims_buyer ON public.guarantee_claims (buyer_id);
CREATE INDEX IF NOT EXISTS idx_guarantee_claims_seller ON public.guarantee_claims (seller_id);
CREATE INDEX IF NOT EXISTS idx_guarantee_claims_status ON public.guarantee_claims (status);
