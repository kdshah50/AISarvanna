/* Admin-approved N sessions for $X total — commission % applies to package_total_price_mxn (centavos). */

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS package_session_count INT,
  ADD COLUMN IF NOT EXISTS package_total_price_mxn INT;

COMMENT ON COLUMN public.listings.package_session_count IS 'If set with package_total_price_mxn: N sessions in approved package (>=2).';
COMMENT ON COLUMN public.listings.package_total_price_mxn IS 'Total MXN for all N sessions, in centavos (same unit as price_mxn).';

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS package_session_count INT;

COMMENT ON COLUMN public.service_bookings.package_session_count IS 'Sessions covered by this payment when listing had a package at checkout; null = single-session pricing.';
