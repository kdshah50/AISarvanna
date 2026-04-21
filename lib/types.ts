export interface ListingCard {
  id: string;
  title: string;
  price_mxn: number;
  category_id: string;
  condition: string;
  location_city: string | null;
  colonia_label: string | null;
  photo_url: string | null;
  shipping_available: boolean;
  negotiable: boolean;
  seller_name: string;
  seller_badge: string;
  seller_verified: boolean;
  payment_methods: string[] | null;
}

export const PAYMENT_METHODS_MX: Record<string, { label: string; icon: string; desc: string }> = {
  efectivo:     { label: "Efectivo",        icon: "💵", desc: "Pago en efectivo al recibir el servicio" },
  spei:         { label: "SPEI",            icon: "🏦", desc: "Transferencia bancaria instantánea" },
  oxxo:         { label: "OXXO Pay",        icon: "🏪", desc: "Pago en tienda OXXO con referencia" },
  mercadopago:  { label: "Mercado Pago",    icon: "💳", desc: "Pago con tarjeta o saldo Mercado Pago" },
  whatsapp:     { label: "Acordar por WhatsApp", icon: "💬", desc: "Coordinar método de pago por WhatsApp" },
};
