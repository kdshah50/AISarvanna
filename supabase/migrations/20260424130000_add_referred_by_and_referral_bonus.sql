/* Idempotent: add referred_by + referral_bonus_granted_at if missing (e.g. partial run). */

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users (id);

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users (referred_by);

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS referral_bonus_granted_at TIMESTAMPTZ;
