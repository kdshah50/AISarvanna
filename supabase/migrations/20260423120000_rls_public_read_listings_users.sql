-- After 20260422120000_row_level_security: RLS is ON with no policies, so anon
-- (publishable key) cannot SELECT anything. The Next app is supposed to use the
-- service role (bypasses RLS), but any path using anon, embeds, or local dev
-- without the service key would see empty or 401/empty responses.
-- These read-only policies let anon/authenticated read public catalog data
-- (NOT conversations/messages — those stay without SELECT for anon).
--
-- Run in Supabase SQL Editor if migrations are not auto-applied.

DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
CREATE POLICY "listings_select_active"
ON public.listings
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (status = 'active');

DROP POLICY IF EXISTS "users_select_sellers_of_active_listing" ON public.users;
CREATE POLICY "users_select_sellers_of_active_listing"
ON public.users
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.seller_id = users.id
      AND l.status = 'active'
  )
);

COMMENT ON POLICY "listings_select_active" ON public.listings IS
  'Public read for active anuncios; service role still used by Next server.';

COMMENT ON POLICY "users_select_sellers_of_active_listing" ON public.users IS
  'Anon can read only users who are sellers of at least one active listing (join/embed).';
