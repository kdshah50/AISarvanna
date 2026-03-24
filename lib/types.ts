export interface ListingCard {
  id: string;
  title: string;
  price_mxn: number;
  category_id: string;
  condition: string;
  location_city: string | null;
  photo_url: string | null;
  shipping_available: boolean;
  negotiable: boolean;
  seller_name: string;
  seller_badge: string;
  seller_verified: boolean;
}
