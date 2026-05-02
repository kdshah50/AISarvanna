/*
  Demo: two ACTIVE + VERIFIED service listings per service-vertical category_id
  (services, beauty, childcare, tutoring, pet_care, fitness, handyman, landscaping).

  Use for QA: hybrid search (OpenAI embeddings optional), geo sort, county ?colonia=, price sliders.

  PREREQUISITE: At least one row in public.users (sign up via the app, or INSERT a demo user).

  RUN: Supabase → SQL Editor → paste → Run.

  ADMIN / PENDING FLOW (already in repo):
    • Ops UI: https://YOUR_DOMAIN/admin
    • Set ADMIN_PIN in Vercel / .env.local (server-side). Enter PIN once on /admin (verify-pin).
    • Queue: Listing queue uses filter “Pending approval” — new service-vertical posts use is_verified=false
      until you approve there (PATCH via “Approve”).
    • This seed sets is_verified=true so demos show in production/search without approving.

  LOCAL ONLY — show pending unapproved service rows without admin:
    SHOW_PENDING_SERVICES=true in .env.local (NODE_ENV=development).

  CLEANUP — remove all seeded rows:
    DELETE FROM public.listings WHERE title_es LIKE '%(demo svc QA)%';

  GEO: rows use coordinates in Essex / Middlesex NJ so distance sort and colonia filtering behave.
*/

DO $$
DECLARE
  sid UUID;
BEGIN
  SELECT id INTO sid FROM public.users ORDER BY created_at ASC LIMIT 1;
  IF sid IS NULL THEN
    RAISE EXCEPTION 'public.users is empty — create an account first, then re-run.';
  END IF;

  INSERT INTO public.listings (
    seller_id, title_es, title_en, description_es, description_en,
    price_mxn, category_id, condition, status, is_verified,
    location_city, location_state, zip_code, location_lat, location_lng,
    shipping_available, negotiable, photo_urls, payment_methods, expires_at
  ) VALUES
  -- ── General services ───────────────────────────────────────────────
  (sid, 'Limpieza profunda hogar — 3h (demo svc QA)',
   'Deep home cleaning — 3h (demo svc QA)',
   'Servicio de demostración: limpieza profunda tres horas — ideal para QA de búsqueda y ubicación.',
   'Demo listing — deep cleaning for search/geo QA.',
   18000, 'services', 'good', 'active', TRUE,
   'Edison', 'New Jersey', '08837', 40.519, -74.412, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'tarjeta', 'paypal']::text[], now() + interval '120 days'),

  (sid, 'Montaje muebles IKEA / cargas locales (demo svc QA)',
   'IKEA assembly / local hauling (demo svc QA)',
   'Demo: armado de muebles flat-pack y cargas dentro del condado. Palabras para búsqueda: muebles IKEA montaje mudanza menor.',
   'Demo: IKEA-style assembly keywords for sparse search.',
   45000, 'services', 'good', 'active', TRUE,
   'Woodbridge Township', 'New Jersey', '07095', 40.557, -74.285, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'whatsapp']::text[], now() + interval '120 days'),

  -- ── Beauty ─────────────────────────────────────────────────────────
  (sid, 'Manicura y pedicura gel — centro Newark (demo svc QA)',
   'Gel manicure & pedicure — Newark downtown (demo svc QA)',
   'Demo belleza: manicura pedicura gel español inglés manicure Newark salón profesional keratin.',
   'Demo beauty salon gel nails Newark.',
   35000, 'beauty', 'good', 'active', TRUE,
   'Newark', 'New Jersey', '07102', 40.7357, -74.1724, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'stripe']::text[], now() + interval '120 days'),

  (sid, 'Barbería fades y barba — Edison (demo svc QA)',
   'Barbershop fades & beard trims — Edison (demo svc QA)',
   'Fade barba navaja haircut hombre Edison Middlesex grooming.',
   'Barber fade beard demo Edison NJ.',
   22000, 'beauty', 'good', 'active', TRUE,
   'Edison', 'New Jersey', '08817', 40.5182, -74.3895, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'whatsapp']::text[], now() + interval '120 days'),

  -- ── Childcare ────────────────────────────────────────────────────────
  (sid, 'Cuidadora infantil bilingüe — Union County (demo svc QA)',
   'Bilingual childcare — Union County (demo svc QA)',
   'Demo babysitter niños escuela pickups Elizabeth niñera cuidados licencia primera auxilios (simulado QA).',
   'Demo nanny childcare pickups keywords.',
   55000, 'childcare', 'good', 'active', TRUE,
   'Elizabeth', 'New Jersey', '07208', 40.666, -74.226, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo']::text[], now() + interval '120 days'),

  (sid, 'Guardería en casa — medio día Middlesex (demo svc QA)',
   'Part-time daycare — Middlesex demo (QA)',
   'Cuidado infantil medio día bebés niños desarrollo ludoteca New Brunswick nearby.',
   'Part-time daycare Middlesex QA.',
   48000, 'childcare', 'good', 'active', TRUE,
   'New Brunswick', 'New Jersey', '08901', 40.4862, -74.4518, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'whatsapp']::text[], now() + interval '120 days'),

  -- ── Tutoring ─────────────────────────────────────────────────────────
  (sid, 'Matemáticas secundaria en línea SAT prep (demo svc QA)',
   'High school math & SAT tutoring online (demo svc QA)',
   'Clases virtuales algebra cálculo examen tutoring Zoom SAT math homework help español inglés demo.',
   'Online SAT math tutoring bilingual demo.',
   40000, 'tutoring', 'good', 'active', TRUE,
   'Somerset County', 'New Jersey', '08873', 40.499, -74.527, TRUE, TRUE,
   '[]'::jsonb, ARRAY['stripe', 'paypal']::text[], now() + interval '120 days'),

  (sid, 'Inglés conversación conversación práctica Edison (demo svc QA)',
   'English conversation practice — Edison demo (QA)',
   'Tutor inglés nivel intermedio conversación pronunciación EFL españohablantes Edison.',
   'English conversation Edison demo.',
   28000, 'tutoring', 'good', 'active', TRUE,
   'Edison', 'New Jersey', '08837', 40.510, -74.395, TRUE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'stripe']::text[], now() + interval '120 days'),

  -- ── Pet care ─────────────────────────────────────────────────────────
  (sid, 'Paseo de perros 30–60 min Mercer (demo svc QA)',
   'Dog walks 30–60 min — Mercer demo (QA)',
   'Pets pet sitter leash dog walking Mercer Princeton area tarde mañanas.',
   'Dog walking Mercer demo.',
   20000, 'pet_care', 'good', 'active', TRUE,
   'Trenton', 'New Jersey', '08608', 40.220, -74.756, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'whatsapp']::text[], now() + interval '120 days'),

  (sid, 'Corte de uñas y baño mascotas Edison (demo svc QA)',
   'Nail trim & wash small pets — Edison demo (QA)',
   'Dog grooming grooming baño tijeras Edison New Jersey grooming pet care.',
   'Pet nail trim wash Edison QA.',
   32000, 'pet_care', 'good', 'active', TRUE,
   'Edison', 'New Jersey', '08820', 40.547, -74.362, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo']::text[], now() + interval '120 days'),

  -- ── Fitness ──────────────────────────────────────────────────────────
  (sid, 'Entrenamiento personal fuerza Newark (demo svc QA)',
   'Personal trainer strength — Newark demo (QA)',
   'Sesiones gimnasio pesas mobility coaching fitness centro Newark Rutgers area.',
   'Personal training Newark QA.',
   65000, 'fitness', 'good', 'active', TRUE,
   'Newark', 'New Jersey', '07107', 40.765, -74.178, FALSE, TRUE,
   '[]'::jsonb, ARRAY['stripe']::text[], now() + interval '120 days'),

  (sid, 'Yoga al aire libre Central Jersey (demo svc QA)',
   'Outdoor yoga — Central NJ demo (QA)',
   'Clases yoga matutinas parque nivel principiante flexibilidad Edison Woodbridge cercanías.',
   'Outdoor yoga Edison area demo.',
   15000, 'fitness', 'good', 'active', TRUE,
   'Perth Amboy', 'New Jersey', '08861', 40.507, -74.274, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo']::text[], now() + interval '120 days'),

  -- ── Handyman ───────────────────────────────────────────────────────
  (sid, 'Electricista menor — lámparas tomas Edison (demo svc QA)',
   'Minor electrician — fixtures & outlets Edison (QA)',
   'Reparaciones plomería eléctrica menor drywall handyman drywall pintura menor demo.',
   'Minor electrical handyman Edison demo.',
   42000, 'handyman', 'good', 'active', TRUE,
   'Edison', 'New Jersey', '08817', 40.524, -74.379, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'whatsapp']::text[], now() + interval '120 days'),

  (sid, 'Montaje drywall y parcheo pequeños (demo svc QA)',
   'Small drywall patch & repair (demo svc QA)',
   'Handyman parche drywall tornillos studs pintura menor Middlesex zona.',
   'Drywall patches Middlesex QA.',
   38000, 'handyman', 'good', 'active', TRUE,
   'Piscataway', 'New Jersey', '08854', 40.551, -74.463, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo']::text[], now() + interval '120 days'),

  -- ── Landscaping ─────────────────────────────────────────────────────
  (sid, 'Corte césped y bordes — weekly Union (demo svc QA)',
   'Lawn mow & edging — weekly Union demo (QA)',
   'Jardinero paisaje césped riego poda temporada Union County español inglés cortar pasto bordeadora.',
   'Weekly mowing Union County demo.',
   30000, 'landscaping', 'good', 'active', TRUE,
   'Linden', 'New Jersey', '07036', 40.622, -74.259, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'stripe']::text[], now() + interval '120 days'),

  (sid, 'Diseño jardín pequeño y mulching (demo svc QA)',
   'Small garden design & mulch (demo svc QA)',
   'Landscape mulch flower beds pavers diseño patios residencial demo Middlesex cercanías.',
   'Garden design mulch demos Middlesex.',
   52000, 'landscaping', 'good', 'active', TRUE,
   'Metuchen', 'New Jersey', '08840', 40.538, -74.369, FALSE, TRUE,
   '[]'::jsonb, ARRAY['efectivo', 'paypal']::text[], now() + interval '120 days');

  RAISE NOTICE 'Inserted 16 verified demo service listings linked to seller %', sid;
END $$;
