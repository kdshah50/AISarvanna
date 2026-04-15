-- Run ONLY if a previous attempt created listing_conversations with the wrong listing_id type
-- (e.g. TEXT while public.listings.id is UUID). Then re-run 20260420120000_listing_messaging.sql.

DROP TABLE IF EXISTS public.listing_messages;
DROP TABLE IF EXISTS public.listing_conversations;
