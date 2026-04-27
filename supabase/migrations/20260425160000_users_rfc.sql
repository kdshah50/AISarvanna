-- RFC (Registro Federal de Contribuyentes) — optional, collected for admin review alongside CURP.
-- Not exposed on anon/authenticated column grants (same as curp).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rfc text;

COMMENT ON COLUMN public.users.rfc IS
  'Optional RFC string; normalized in app; verified manually by admin (no SAT API in v1).';
