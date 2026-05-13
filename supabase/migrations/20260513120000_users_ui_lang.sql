-- Preferred UI language (English default; persists with buyer/seller profile).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ui_lang text DEFAULT 'en';

UPDATE public.users SET ui_lang = 'en' WHERE ui_lang IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_ui_lang_check;
ALTER TABLE public.users ADD CONSTRAINT users_ui_lang_check
  CHECK (ui_lang IS NOT NULL AND ui_lang IN ('en', 'es', 'hi', 'gu'));

ALTER TABLE public.users ALTER COLUMN ui_lang SET NOT NULL;

COMMENT ON COLUMN users.ui_lang IS 'UI language: en | es | hi | gu — Hindi/Gujarati shown for South Asian lane; Latino lane uses en/es only.';
