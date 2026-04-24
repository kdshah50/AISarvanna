CREATE TABLE IF NOT EXISTS public.listing_service_contact_gate (
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  contacted_in_app BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_ack_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_service_contact_gate_buyer ON public.listing_service_contact_gate (buyer_id);

CREATE TABLE IF NOT EXISTS public.service_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  note TEXT NOT NULL CHECK (char_length(note) > 0 AND char_length(note) <= 2000),
  buyer_preference_text TEXT CHECK (buyer_preference_text IS NULL OR char_length(buyer_preference_text) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_booking_requests_listing ON public.service_booking_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_service_booking_requests_buyer ON public.service_booking_requests (buyer_id);

COMMENT ON TABLE public.listing_service_contact_gate IS 'Per buyer+service listing: in-app message or WhatsApp ack before booking; APIs use service role.';
COMMENT ON TABLE public.service_booking_requests IS 'Buyer booking intent after contact gate; APIs use service role.';
