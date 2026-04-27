-- Admin-toggle: RFC reviewed (manual process; no SAT API in v1).
-- Exposed to anon like ine_verified for listing trust UI.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rfc_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.rfc_verified IS
  'Set by admin after manual RFC review (optional complement to INE).';

-- Same visibility as ine_verified for listing embeds / public seller trust UI.
GRANT SELECT (rfc_verified) ON public.users TO anon, authenticated;
