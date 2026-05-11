-- Browse lane for personalized category bar; nullable for legacy rows.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS community_lane text
  CHECK (community_lane IS NULL OR community_lane IN ('latino', 'south_asian'));

-- Goods vs service (API sets on insert; backfill from category_id).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS listing_type text
  CHECK (listing_type IS NULL OR listing_type IN ('goods', 'service'));

COMMENT ON COLUMN users.community_lane IS 'Browse lane: latino | south_asian (null = not chosen; show full catalog in UI).';
COMMENT ON COLUMN listings.listing_type IS 'goods | service — mirrors service-vertical vs goods categories.';

UPDATE listings
SET listing_type = 'service'
WHERE listing_type IS NULL
  AND lower(trim(category_id)) IN (
    'services',
    'beauty',
    'childcare',
    'tutoring',
    'pet_care',
    'fitness',
    'handyman',
    'landscaping',
    'mehndi',
    'tiffin',
    'wedding_services'
  );

UPDATE listings SET listing_type = 'goods' WHERE listing_type IS NULL AND category_id IS NOT NULL;
