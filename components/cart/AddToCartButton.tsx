"use client";

import { useCart } from "@/components/cart/CartContext";

export default function AddToCartButton({
  listingId,
  titleEs,
  priceMxnCents,
}: {
  listingId: string;
  titleEs: string;
  priceMxnCents: number;
}) {
  const { addItem } = useCart();
  return (
    <button
      type="button"
      onClick={() =>
        addItem({
          listingId,
          titleEs,
          priceMxnCents,
          qty: 1,
        })
      }
      className="w-full py-3 rounded-xl border-2 border-[#D4A017] text-[#1B4332] font-semibold text-sm hover:bg-[#FDF8F1] transition-colors"
    >
      Agregar al carrito
    </button>
  );
}
