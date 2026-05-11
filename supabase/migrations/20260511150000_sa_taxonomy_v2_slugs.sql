-- South Asian taxonomy slug alignment (see lib/marketplace-categories.ts).
UPDATE listings
SET category_id = 'wedding_photo'
WHERE lower(trim(category_id)) = 'wedding_services';

UPDATE listings
SET category_id = 'saree_lehenga'
WHERE lower(trim(category_id)) = 'ethnic_wear';

-- listing_type for new / renamed verticals
UPDATE listings
SET listing_type = 'service'
WHERE lower(trim(category_id)) IN (
  'wedding_photo',
  'dj_music',
  'catering',
  'home_improvement'
);

UPDATE listings
SET listing_type = 'goods'
WHERE lower(trim(category_id)) IN ('saree_lehenga', 'puja_items');

-- Catch any service slugs missed before listing_type existed (idempotent).
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
    'wedding_photo',
    'dj_music',
    'catering',
    'home_improvement'
  );
