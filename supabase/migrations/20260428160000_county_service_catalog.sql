/*
 county_service_catalog — NJ (Middlesex + Monmouth).
 Drives county service chips on home when ?colonia=<county_key>.
 Public read for active rows (anon + authenticated).
 Run only on the AISaravanna Supabase project, not Mexico/other DBs.
*/

CREATE TABLE IF NOT EXISTS public.county_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_key TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_es TEXT NOT NULL,
  blurb_en TEXT NOT NULL DEFAULT '',
  blurb_es TEXT NOT NULL DEFAULT '',
  strategy_tag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT county_service_catalog_county_slug_unique UNIQUE (county_key, service_slug),
  CONSTRAINT county_service_catalog_county_key_check CHECK (
    county_key ~ '^[a-z][a-z0-9_]*$' AND length(county_key) <= 64
  )
);

CREATE INDEX IF NOT EXISTS idx_county_service_catalog_county
  ON public.county_service_catalog (county_key)
  WHERE active = TRUE;

COMMENT ON TABLE public.county_service_catalog IS
  'US/NJ: curated service lines per county; complements marketplace category_id on listings.';
COMMENT ON COLUMN public.county_service_catalog.strategy_tag IS
  'Optional: recurring | high_ticket | trust | ai_concierge — for future filters.';

ALTER TABLE public.county_service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "county_service_catalog_select_active" ON public.county_service_catalog;
CREATE POLICY "county_service_catalog_select_active"
ON public.county_service_catalog
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (active = TRUE);

GRANT SELECT ON public.county_service_catalog TO anon, authenticated;

-- ── Middlesex County (initial set) ─────────────────────────────────────────
INSERT INTO public.county_service_catalog (
  county_key, service_slug, label_en, label_es, blurb_en, blurb_es, strategy_tag, sort_order
) VALUES
  ('middlesex', 'home_cleaning', 'Home cleaning', 'Limpieza del hogar',
   'Repeat-friendly home cleaning — AI-assisted booking fit.', 'Limpieza recurrente — encaje con reserva asistida por IA.', 'recurring', 10),
  ('middlesex', 'hvac', 'HVAC repair & install', 'Climatización / HVAC',
   'Heating & cooling tune-ups, installs, emergency calls.', 'Calefacción y aire: mantenimiento, instalación, urgencias.', 'trust', 20),
  ('middlesex', 'handyman', 'Handyman', 'Manitas / reparaciones',
   'Small repairs, mounting, minor carpentry.', 'Pequeñas reparaciones, montajes, carpintería ligera.', 'ai_concierge', 30),
  ('middlesex', 'senior_care', 'Senior & home care', 'Cuidado de adultos mayores',
   'Non-medical assistance, companionship, daily living support.', 'Apoyo no médico, compañía, ayuda en el hogar.', 'high_ticket', 40),
  ('middlesex', 'pet_care', 'Pet care & dog walking', 'Mascotas y paseos',
   'Dog walking, drop-in visits, pet sitting.', 'Paseos, visitas, cuidado de mascotas.', 'recurring', 50),
  ('middlesex', 'tutoring', 'Tutoring & lessons', 'Clases y tutorías',
   'K–12 and test prep; in-person or hybrid.', 'Refuerzo escolar y exámenes; presencial u híbrido.', 'trust', 60),
  ('middlesex', 'plumbing', 'Plumbing', 'Plomería',
   'Leaks, fixtures, water heaters, urgent repairs.', 'Fugas, grifería, boilers, urgencias.', 'trust', 70),
  ('middlesex', 'electrical', 'Electrical', 'Electricidad',
   'Outlets, panels, lighting, code-safe work.', 'Contactos, tableros, iluminación, trabajo normado.', 'trust', 80),
  ('middlesex', 'moving_labor', 'Moving & labor', 'Mudanza y carga',
   'Loading, unloading, local moving help.', 'Carga, descarga, ayuda en mudanzas locales.', 'ai_concierge', 90),
  ('middlesex', 'legal_consult', 'Legal consults', 'Consultas legales',
   'Initial consults for local counsel — high-trust vertical.', 'Consultas iniciales con abogados locales — vertical de confianza.', 'high_ticket', 100)
ON CONFLICT (county_key, service_slug) DO NOTHING;

-- ── Monmouth County (initial set) ──────────────────────────────────────────
INSERT INTO public.county_service_catalog (
  county_key, service_slug, label_en, label_es, blurb_en, blurb_es, strategy_tag, sort_order
) VALUES
  ('monmouth', 'home_cleaning', 'Home cleaning', 'Limpieza del hogar',
   'Subscription-style recurring cleans near the Shore & suburbs.', 'Limpiezas recurrentes cerca de la costa y suburbios.', 'recurring', 10),
  ('monmouth', 'hvac', 'HVAC repair & install', 'Climatización / HVAC',
   'Seasonal tune-ups and coastal humidity-ready systems.', 'Mantenimiento estacional y sistemas para humedad costera.', 'trust', 20),
  ('monmouth', 'pool_spa', 'Pool & spa care', 'Piscinas y spas',
   'Opening, cleaning, chemical balance — Shore-adjacent demand.', 'Apertura, limpieza, químicos — demanda costera.', 'recurring', 30),
  ('monmouth', 'landscaping', 'Landscaping', 'Jardinería y paisajismo',
   'Lawns, native plantings, storm cleanup.', 'Césped, plantas nativas, limpieza tras tormentas.', 'recurring', 40),
  ('monmouth', 'event_services', 'Events & catering', 'Eventos y catering',
   'Weddings, milestones, corporate — fragmented market fit.', 'Bodas, celebraciones, corporativo — mercado fragmentado.', 'high_ticket', 50),
  ('monmouth', 'senior_care', 'Senior & home care', 'Cuidado de adultos mayores',
   'Trusted in-home support along high-retirement corridors.', 'Apoyo en hogar en corredores con alta demanda.', 'high_ticket', 60),
  ('monmouth', 'pet_care', 'Pet care & dog walking', 'Mascotas y paseos',
   'Recurring walks and sitting at the Shore.', 'Paseos y cuidado recurrente en la costa.', 'recurring', 70),
  ('monmouth', 'marine_boat', 'Boat & marine help', 'Ayuda náutica',
   'Seasonal prep, detailing referrals — niche Monmouth/Shore.', 'Preparación de temporada — nicho Costa NJ.', 'high_ticket', 80),
  ('monmouth', 'financial_planning', 'Financial planning intro', 'Intro planificación financiera',
   'Initial fiduciary/advisory conversations — trust-heavy.', 'Primeras conversaciones con asesores — alto requisito de confianza.', 'high_ticket', 90),
  ('monmouth', 'mobile_notary', 'Mobile notary', 'Notario móvil',
   'Closings and affidavits at your location.', 'Cierres y declaraciones en tu ubicación.', 'ai_concierge', 100)
ON CONFLICT (county_key, service_slug) DO NOTHING;
