-- Defense in depth: RLS (users_select_sellers_of_active_listing) can still
-- expose one row, but with column-level SELECT only anon/authenticated
-- can read a safe subset — not phone, curp, rfc, ine_photo_url, or referred_by.
-- Service role and postgres remain unrestricted for server routes.

REVOKE ALL ON public.users FROM anon, authenticated;

GRANT SELECT (
  id,
  display_name,
  avatar_url,
  trust_badge,
  ine_verified,
  phone_verified,
  whatsapp_optin,
  created_at
) ON public.users TO anon, authenticated;

GRANT ALL PRIVILEGES ON public.users TO service_role;

COMMENT ON TABLE public.users IS
  'RLS on. Anon: column-restricted SELECT for embeds. Server uses service role.';
