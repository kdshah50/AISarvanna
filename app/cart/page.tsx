"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";

function fmtMXN(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type Preview = {
  connectRequired?: boolean;
  stripeMode?: string;
  subtotalCents: number;
  commissionCents: number;
  vatCents: number;
  totalCents: number;
  vatPercent: number;
  lines: Array<{
    listingId: string;
    titleEs: string;
    qty: number;
    lineSubtotalCents: number;
    lineCommissionCents: number;
  }>;
};

function CartPageInner() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled");
  const { lines, setQty, removeItem, clear } = useCart();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    if (lines.length === 0) {
      setPreview(null);
      setPreviewErr(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setPreviewErr(null);
    fetch("/api/cart/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((l) => ({ listingId: l.listingId, qty: l.qty })),
      }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((data as { error?: string }).error ?? "Error");
        setPreview(data as Preview);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setPreview(null);
        setPreviewErr(e instanceof Error ? e.message : "Error");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [lines]);

  const pay = async () => {
    if (lines.length === 0 || payBusy) return;
    setPayBusy(true);
    setPreviewErr(null);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ listingId: l.listingId, qty: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data as { message?: string; error?: string }).message ||
          (data as { error?: string }).error ||
          "No se pudo pagar";
        throw new Error(msg);
      }
      const url = (data as { url?: string }).url;
      if (url) window.location.href = url;
    } catch (e: unknown) {
      setPreviewErr(e instanceof Error ? e.message : "Error");
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold text-[#1B4332] mb-2">Carrito</h1>
      <p className="text-sm text-[#6B7280] mb-4">
        Compra de artículos (no servicios). Comisión e IVA se muestran antes de pagar; la comisión por anuncio la define el
        admin como en servicios.
      </p>
      {preview?.connectRequired === false && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <strong>Modo carrito sin Connect:</strong> el cobro va a la cuenta Stripe de la plataforma. El reparto al vendedor es
          manual hasta que actives Stripe Connect y pongas <code className="text-[11px]">MARKETPLACE_CONNECT_REQUIRED=true</code>.
        </div>
      )}
      {preview?.connectRequired === true && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          El vendedor debe tener <strong>cobros Stripe (Connect)</strong> activos; si no, usa mensajes o la tarifa de contacto
          en el anuncio.
        </div>
      )}

      {cancelled && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pago cancelado. Puedes intentar de nuevo.
        </div>
      )}

      {lines.length === 0 ? (
        <p className="text-[#6B7280] mb-4">Tu carrito está vacío.</p>
      ) : (
        <ul className="space-y-3 mb-6">
          {lines.map((l) => (
            <li
              key={l.listingId}
              className="flex gap-3 items-start border border-[#E5E0D8] rounded-xl p-3 bg-white"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1917] truncate">
                  {l.titleEs || l.listingId.slice(0, 8)}
                </p>
                {l.priceMxnCents != null && (
                  <p className="text-xs text-[#6B7280]">{fmtMXN(l.priceMxnCents)} c/u</p>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={99}
                value={l.qty}
                onChange={(e) => setQty(l.listingId, parseInt(e.target.value, 10) || 1)}
                className="w-14 border border-[#E5E0D8] rounded-lg px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(l.listingId)}
                className="text-xs text-red-600 font-semibold px-2"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <button type="button" onClick={() => clear()} className="text-xs text-[#6B7280] underline mb-4">
          Vaciar carrito
        </button>
      )}

      {loading && <p className="text-sm text-[#6B7280]">Calculando totales…</p>}
      {previewErr && <p className="text-sm text-red-600 mb-4">{previewErr}</p>}

      {preview && lines.length > 0 && (
        <div className="rounded-xl border border-[#E5E0D8] bg-[#FDF8F1] p-4 space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Subtotal</span>
            <span className="font-medium">{fmtMXN(preview.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Comisión Naranjogo</span>
            <span className="font-medium">{fmtMXN(preview.commissionCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">IVA ({preview.vatPercent}%)</span>
            <span className="font-medium">{fmtMXN(preview.vatCents)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#E5E0D8] text-base font-bold text-[#1B4332]">
            <span>Total</span>
            <span>{fmtMXN(preview.totalCents)}</span>
          </div>
          <p className="text-xs text-[#6B7280] pt-2">
            El vendedor recibe el subtotal vía Stripe Connect; Naranjogo retiene comisión + IVA mostrados. Ajusta{" "}
            <code className="text-[11px]">MARKETPLACE_VAT_PERCENT</code> en el servidor si cambia el IVA.
          </p>
        </div>
      )}

      {lines.length > 0 && preview && (
        <button
          type="button"
          disabled={payBusy || loading}
          onClick={() => void pay()}
          className="w-full py-3 rounded-xl bg-[#D4A017] text-white font-semibold disabled:opacity-50"
        >
          {payBusy ? "Redirigiendo a Stripe…" : "Pagar con Stripe"}
        </button>
      )}

      <p className="text-center mt-6">
        <Link href="/" className="text-sm text-[#1B4332] font-semibold hover:underline">
          ← Seguir comprando
        </Link>
      </p>
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<main className="max-w-lg mx-auto px-4 py-8 text-[#6B7280]">Cargando carrito…</main>}>
      <CartPageInner />
    </Suspense>
  );
}
