/*
  Demo: one verified services listing in Middlesex County (NJ coords).
  Run in AISaravanna Supabase → SQL Editor. Requires at least one public.users row.
  Then open: http://localhost:3000/?category=services&colonia=middlesex
  Cleanup: DELETE FROM public.listings WHERE title_es LIKE '%(demo servicio NJ)%';
*/

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
  'Anuncio de demostración para Middlesex, New Jersey. Puedes borrarlo en Supabase cuando quieras.',
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
ORDER BY u.created_at ASC
LIMIT 1
RETURNING id, title_es, category_id, is_verified, status;
