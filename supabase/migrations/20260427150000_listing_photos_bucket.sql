-- Public listing images (URLs stored in listings.photo_urls text[]).

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "listing_photos_public_read" ON storage.objects;

CREATE POLICY "listing_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

COMMENT ON POLICY "listing_photos_public_read" ON storage.objects IS
  'Anyone can read listing images; uploads go through Next.js API with service role.';
