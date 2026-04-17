-- Add foreign key from listings.seller_id → users.id so PostgREST can auto-join.
-- Without this FK, queries like `select=*,users(display_name,phone)` return null.

ALTER TABLE public.listings
  ADD CONSTRAINT fk_listings_seller
  FOREIGN KEY (seller_id)
  REFERENCES public.users (id)
  ON DELETE SET NULL;
