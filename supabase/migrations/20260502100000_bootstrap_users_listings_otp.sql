/*
  Core schema bootstrap for AISaravanna when public.listings (and related tables) do not exist.
  Run this ONCE in Supabase SQL Editor on your AISaravanna project before other listing migrations.

  After this, optionally run 20260502120000_listings_add_is_verified.sql (no-op if is_verified exists)
  and remaining migrations (RLS read policies, county_service_catalog, etc.).
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  display_name TEXT,
  trust_badge TEXT NOT NULL DEFAULT 'none',
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  referred_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  curp TEXT,
  rfc TEXT,
  ine_photo_url TEXT,
  rfc_verified BOOLEAN DEFAULT FALSE,
  ine_verified BOOLEAN DEFAULT FALSE,
  stripe_connect_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_unique UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID,
  title_es TEXT NOT NULL,
  title_en TEXT,
  description_es TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  price_mxn INTEGER NOT NULL CHECK (price_mxn >= 0),
  category_id TEXT NOT NULL DEFAULT 'services',
  condition TEXT NOT NULL DEFAULT 'good',
  status TEXT NOT NULL DEFAULT 'active',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  location_city TEXT,
  location_state TEXT,
  zip_code TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  shipping_available BOOLEAN NOT NULL DEFAULT FALSE,
  negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_methods TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ,
  commission_pct NUMERIC,
  package_session_count INT,
  package_total_price_mxn INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON public.listings (category_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings (created_at DESC);

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created_at ON public.otp_codes (phone, created_at DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT ALL ON public.listings TO postgres, service_role;
GRANT ALL ON public.otp_codes TO postgres, service_role;

COMMENT ON TABLE public.users IS 'AISaravanna marketplace users (phone OTP auth).';
COMMENT ON TABLE public.listings IS 'Marketplace listings; server uses service role.';
