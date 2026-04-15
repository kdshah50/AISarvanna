-- In-app messaging: one thread per (listing_id, buyer_id). Seller is denormalized from listings.seller_id.
-- Run in Supabase SQL Editor on the same project as the app.
--
-- listings.id type: many Supabase projects use UUID for listings.id. If yours is TEXT, change
-- listing_id below to TEXT and drop the REFERENCES clause or match your listings PK type.

CREATE TABLE IF NOT EXISTS public.listing_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listing_conversations_listing_buyer_unique UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_conversations_buyer ON public.listing_conversations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_listing_conversations_seller ON public.listing_conversations (seller_id);
CREATE INDEX IF NOT EXISTS idx_listing_conversations_listing ON public.listing_conversations (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_conversations_updated ON public.listing_conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.listing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.listing_conversations (id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_messages_conversation_created ON public.listing_messages (conversation_id, created_at ASC);

COMMENT ON TABLE public.listing_conversations IS 'Buyer–seller thread per listing; APIs use service role.';
COMMENT ON TABLE public.listing_messages IS 'Messages inside a listing_conversations thread.';
