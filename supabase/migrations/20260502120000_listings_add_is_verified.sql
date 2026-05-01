ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.listings.is_verified IS
  'Admin-approved listing; public browse/search requires true for services.';

UPDATE public.listings SET is_verified = FALSE WHERE is_verified IS NULL;
