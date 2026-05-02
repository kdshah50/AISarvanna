/*
  Hybrid search QA: one **verified** row per service-vertical category (keyword ILIKE, geo boost, price filters,
  optional vector RPC if `OPENAI_API_KEY` + `search_listings_dense` exist in Supabase).

  Prerequisites: run `seed-first-demo-listing.sql` (or any row in `public.users` with phone `15555550100`).
  Prices are **USD cents** (`price_mxn` column).

  Try locally:
  - /?category=beauty
  - /?category=tutoring&q=SAT
  - /?category=pet_care&q=dog&lat=40.49&lng=-74.45
  - /?category=handyman&pmax=150
  - JSON: GET /api/search?q=math%20tutor&category=tutoring&lat=40.72&lng=-74.03&pmax=200

  Cleanup:
    DELETE FROM public.listings WHERE title_en LIKE '%(hybrid demo)%';
*/

INSERT INTO public.listings (
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
  u.id,
  v.title_es,
  v.title_en,
  v.description_es,
  v.price_mxn,
  v.category_id,
  'new',
  'active',
  true,
  v.location_city,
  'New Jersey',
  v.zip_code,
  v.location_lat,
  v.location_lng,
  false,
  true,
  '[]'::jsonb,
  ARRAY['efectivo', 'whatsapp']::text[],
  (now() + interval '120 days')
FROM public.users AS u
CROSS JOIN (
  VALUES
    (
      'services'::text,
      'Demo limpieza profunda Middlesex (hybrid demo)'::text,
      'Middlesex deep home cleaning demo (hybrid demo)'::text,
      'Limpieza residencial para pruebas de búsqueda. Palabras clave: limpieza, hogar, Middlesex.'::text,
      18500::integer,
      'New Brunswick, NJ'::text,
      '08901'::text,
      40.4862::double precision,
      -74.4518::double precision
    ),
    (
      'beauty',
      'Corte y color en Somerset, NJ (hybrid demo)',
      'Haircut & color — Somerset, NJ (hybrid demo)',
      'Salón y belleza. Keywords: haircut, highlights, Somerset.',
      12500,
      'Somerset, NJ',
      '08873',
      40.4976,
      -74.4885
    ),
    (
      'childcare',
      'Niñera bilingüe Edison / Woodbridge (hybrid demo)',
      'Bilingual nanny Edison & Woodbridge area (hybrid demo)',
      'Cuidado infantil flexible. Keywords: nanny, childcare, Edison.',
      35000,
      'Edison, NJ',
      '08837',
      40.5187,
      -74.4118
    ),
    (
      'tutoring',
      'Tutor SAT matemáticas Middlesex (hybrid demo)',
      'SAT math tutor Middlesex County (hybrid demo)',
      'Prep SAT y álgebra. Keywords: tutor, SAT, math, Middlesex.',
      22000,
      'North Brunswick, NJ',
      '08902',
      40.45,
      -74.48
    ),
    (
      'pet_care',
      'Paseo de perros y pet sitting New Brunswick (hybrid demo)',
      'Dog walking & pet sitting New Brunswick (hybrid demo)',
      'Mascotas pequeñas y medianas. Keywords: dog walking, pets, New Brunswick.',
      9500,
      'New Brunswick, NJ',
      '08901',
      40.486,
      -74.448
    ),
    (
      'fitness',
      'Entrenador personal a domicilio Hoboken (hybrid demo)',
      'Personal trainer at home Hoboken (hybrid demo)',
      'Strength y HIIT. Keywords: fitness, personal trainer, Hoboken.',
      19900,
      'Hoboken, NJ',
      '07030',
      40.7439,
      -74.0324
    ),
    (
      'handyman',
      'Reparación de aire acondicionado Middlesex (hybrid demo)',
      'AC repair same-week Middlesex County (hybrid demo)',
      'HVAC menor y mantenimiento. Keywords: AC repair, handyman, HVAC.',
      28900,
      'Woodbridge, NJ',
      '07095',
      40.5575,
      -74.2845
    ),
    (
      'landscaping',
      'Corte de césped y mulch Freehold / Monmouth (hybrid demo)',
      'Lawn care & mulch Freehold Monmouth County (hybrid demo)',
      'Jardinería residencial. Keywords: lawn, landscaping, Freehold.',
      17500,
      'Freehold, NJ',
      '07728',
      40.2601,
      -74.2734
    )
) AS v(
  category_id,
  title_es,
  title_en,
  description_es,
  price_mxn,
  location_city,
  zip_code,
  location_lat,
  location_lng
)
WHERE u.phone = '15555550100'
  AND NOT EXISTS (
    SELECT 1 FROM public.listings l WHERE l.title_en = v.title_en
  );
