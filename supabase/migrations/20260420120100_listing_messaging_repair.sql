-- Run ONLY if listing_conversations/messages were created with the wrong listing_id type
-- (must match public.listings.id). Then re-run 20260420120000_listing_messaging.sql.

DROP TABLE IF EXISTS public.listing_messages;
DROP TABLE IF EXISTS public.listing_conversations;
