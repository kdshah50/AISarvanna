/* Run before 20260424120000. Repair TEXT user_id / partial referral_codes. */

DROP TABLE IF EXISTS public.referral_codes;

DO $fix$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_favorite_listings'
      AND column_name = 'user_id'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.user_favorite_listings
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_favorite_listings_user_id_fkey'
    ) THEN
      ALTER TABLE public.user_favorite_listings
        ADD CONSTRAINT user_favorite_listings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$fix$;

DO $ref$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'referred_by'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.users DROP COLUMN referred_by;
  END IF;
END
$ref$;
