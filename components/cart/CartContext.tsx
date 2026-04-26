"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "naranjogo_cart_v1";

export type CartLine = {
  listingId: string;
  qty: number;
  titleEs?: string;
  priceMxnCents?: number;
};

type CartContextValue = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (listingId: string, qty: number) => void;
  removeItem: (listingId: string) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.listingId === "string")
      .map((x) => ({
        listingId: x.listingId,
        qty: Math.max(1, Math.min(99, Math.floor(Number(x.qty) || 1))),
        titleEs: x.titleEs,
        priceMxnCents: x.priceMxnCents,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadInitial());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const addItem = useCallback((line: Omit<CartLine, "qty"> & { qty?: number }) => {
    const qty = Math.max(1, Math.min(99, Math.floor(line.qty ?? 1)));
    setLines((prev) => {
      const i = prev.findIndex((p) => p.listingId === line.listingId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          qty: Math.min(99, next[i].qty + qty),
          titleEs: line.titleEs ?? next[i].titleEs,
          priceMxnCents: line.priceMxnCents ?? next[i].priceMxnCents,
        };
        return next;
      }
      return [...prev, { listingId: line.listingId, qty, titleEs: line.titleEs, priceMxnCents: line.priceMxnCents }];
    });
  }, []);

  const setQty = useCallback((listingId: string, qty: number) => {
    const q = Math.max(1, Math.min(99, Math.floor(qty)));
    setLines((prev) => prev.map((p) => (p.listingId === listingId ? { ...p, qty: q } : p)));
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setLines((prev) => prev.filter((p) => p.listingId !== listingId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const value = useMemo(
    () => ({ lines, addItem, setQty, removeItem, clear, count }),
    [lines, addItem, setQty, removeItem, clear, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart requires CartProvider");
  return ctx;
}
