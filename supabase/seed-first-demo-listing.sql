/*
  One-row demo so public.listings is not empty.
  `price_mxn` stores USD cents (e.g. 15000 = $150.00).

  Run in AISaravanna Supabase → SQL Editor (after bootstrap migration).

  Creates a demo user (phone 15555550100) if missing, then one verified services listing in Middlesex, NJ.

  App: http://localhost:3000/?category=services&colonia=middlesex

  Cleanup:
    DELETE FROM public.listings WHERE title_es LIKE '%demo servicio NJ%';
    DELETE FROM public.users WHERE phone = '15555550100';
*/

INSERT INTO public.users (phone, display_name, trust_badge, phone_verified)
VALUES ('15555550100', 'Demo Seller (SQL seed)', 'bronze', true)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.listings (
  id,
  seller_id,
  title_es,
  title_en,
  description_es,
  price_mxn,
  category_id,
  condition,
  status,
  is_verified,
  location_city,
  location_state,
  zip_code,
  location_lat,
  location_lng,
  shipping_available,
  negotiable,
  photo_urls,
  payment_methods,
  expires_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'Limpieza hogar — demo servicio NJ (Middlesex)',
  'Home cleaning — NJ demo service (Middlesex)',
  'Anuncio de demostración. Borrar cuando quieras.',
  15000,
  'services',
  'new',
  'active',
  true,
  'New Brunswick, NJ',
  'New Jersey',
  '08901',
  40.4862,
  -74.4518,
  false,
  true,
  '[]'::jsonb,
  ARRAY['efectivo', 'whatsapp']::text[],
  (now() + interval '90 days')
FROM public.users AS u
WHERE u.phone = '15555550100'
  AND NOT EXISTS (
    SELECT 1 FROM public.listings l WHERE l.title_es LIKE '%demo servicio NJ (Middlesex)%'
  )
RETURNING id, title_es, category_id, is_verified, status;
