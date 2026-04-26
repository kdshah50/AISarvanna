"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";

export default function CartHeaderLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative text-sm font-semibold text-[#1B4332] hover:underline px-2"
      aria-label="Carrito"
    >
      Carrito
      {count > 0 && (
        <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4A017] text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
