/* retention: user_favorite_listings, referral_codes, referred_by, RLS. user_id = uuid = public.users.id */

CREATE TABLE IF NOT EXISTS public.user_favorite_listings (
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fav_listing ON public.user_favorite_listings (listing_id);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes (code);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users (id);

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users (referred_by);

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS referral_bonus_granted_at TIMESTAMPTZ;

DO $rls$
DECLARE
  t TEXT;
  app_tables TEXT[] := ARRAY['user_favorite_listings', 'referral_codes'];
BEGIN
  FOREACH t IN ARRAY app_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END
$rls$;

COMMENT ON TABLE public.user_favorite_listings IS 'Buyer-saved listing IDs. Server uses service role only.';
COMMENT ON TABLE public.referral_codes IS 'Unique referral code per user for the referral program.';
