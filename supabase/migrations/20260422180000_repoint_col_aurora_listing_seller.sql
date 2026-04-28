-- One-time data fix: listing + thread pointed at old user (94a74ff0-…)
-- while Carme signs in as 3d5522b3-… — repoint to the active account.
-- Listing: Cuidado adultos mayores (legacy SMA sample; app geography is now NJ)

UPDATE public.listings
SET seller_id = '3d5522b3-aedf-4625-80a1-8a79708bb893'
WHERE id = 'a1d0b119-0d7e-4660-8e06-d9345c593405'
  AND seller_id = '94a74ff0-d2f4-46a7-b43e-85fb8f2cf524';

UPDATE public.listing_conversations
SET seller_id = '3d5522b3-aedf-4625-80a1-8a79708bb893'
WHERE listing_id = 'a1d0b119-0d7e-4660-8e06-d9345c593405'
  AND seller_id = '94a74ff0-d2f4-46a7-b43e-85fb8f2cf524';

-- Bookings for this listing (if any) should reference the same seller user
UPDATE public.service_bookings
SET seller_id = '3d5522b3-aedf-4625-80a1-8a79708bb893'
WHERE listing_id::text = 'a1d0b119-0d7e-4660-8e06-d9345c593405'
  AND seller_id = '94a74ff0-d2f4-46a7-b43e-85fb8f2cf524';
