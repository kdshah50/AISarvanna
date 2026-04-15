-- OTP codes for WhatsApp login (send-otp / verify-otp API routes).
-- Run in Supabase SQL Editor if this migration was never applied to your project.

create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_codes_phone_created_at
  on public.otp_codes (phone, created_at desc);

comment on table public.otp_codes is 'One-time codes for phone verification; written by Next.js API with service role.';
