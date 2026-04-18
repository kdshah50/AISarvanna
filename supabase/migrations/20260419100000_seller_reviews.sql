-- Seller reviews: buyers rate sellers after paying the service fee.
-- One review per booking, rating 1-5 with optional comment.

CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.service_bookings (id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One review per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_reviews_booking ON public.seller_reviews (booking_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON public.seller_reviews (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_buyer ON public.seller_reviews (buyer_id);

COMMENT ON TABLE public.seller_reviews IS 'Buyer reviews of sellers after paid service bookings.';
