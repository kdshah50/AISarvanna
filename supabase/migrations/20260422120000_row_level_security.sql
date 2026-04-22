-- Row Level Security: close public tables to the anon (publishable) API key.
-- Use SUPABASE_SERVICE_ROLE_KEY only on the server. Service role bypasses RLS.
-- Anon with no policies cannot read or write these tables through PostgREST.

DO $rls$
DECLARE
  t TEXT;
  app_tables TEXT[] := ARRAY[
    'listings',
    'users',
    'otp_codes',
    'service_bookings',
    'listing_service_contact_gate',
    'service_booking_requests',
    'listing_conversations',
    'listing_messages',
    'seller_reviews',
    'reports',
    'guarantee_claims',
    'booking_reminders',
    'loyalty_accounts',
    'loyalty_transactions'
  ];
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

COMMENT ON TABLE public.listings IS 'RLS on — use service role on server, not anon key.';
