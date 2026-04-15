-- If `otp_codes` already existed before20260415140000, CREATE TABLE was skipped and columns may be missing.
-- Run this in Supabase SQL Editor on the SAME project as Vercel's NEXT_PUBLIC_SUPABASE_URL.

alter table public.otp_codes add column if not exists phone text;
alter table public.otp_codes add column if not exists code text;
alter table public.otp_codes add column if not exists expires_at timestamptz;
alter table public.otp_codes add column if not exists used boolean not null default false;
alter table public.otp_codes add column if not exists created_at timestamptz not null default now();

-- If `id` is missing (unlikely), you may need to recreate the table; check Table Editor first.

create index if not exists idx_otp_codes_phone_created_at
  on public.otp_codes (phone, created_at desc);
