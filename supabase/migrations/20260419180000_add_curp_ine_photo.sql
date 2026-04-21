-- Add CURP and INE photo URL columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS curp text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ine_photo_url text;

-- Create storage bucket for INE photos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ine-photos', 'ine-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads via service role (RLS policy)
CREATE POLICY "Service role can manage INE photos"
ON storage.objects FOR ALL
USING (bucket_id = 'ine-photos')
WITH CHECK (bucket_id = 'ine-photos');
