"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type BookingState = {
  isService: boolean;
  needLogin?: boolean;
  isSeller?: boolean;
  canBook: boolean;
  contactedInApp: boolean;
  whatsappAcked: boolean;
  hasPaidBooking: boolean;
  paidBookingId: string | null;
  revealedPhone: string | null;
  revealedWhatsappUrl: string | null;
  hasPendingBooking: boolean;
  pendingBookingId: string | null;
  commissionAmountCents: number;
  commissionPct: number;
};

function formatMXN(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function ServiceBookingBlock({
  listingId,
  isService,
  sellerId,
}: {
  listingId: string;
  isService: boolean;
  sellerId: string | null;
}) {
  const [meId, setMeId] = useState<string | null | undefined>(undefined);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [loading, setLoading] = useState(!!isService);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loyaltyHint, setLoyaltyHint] = useState<{ bookingsUntil: number; discountPct: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const prevContacted = useRef(false);

  const load = useCallback(async () => {
    if (!isService) {
      setLoading(false);
      return;
    }
    setMsg("");
    const meRes = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (meRes.ok) {
      const j = await meRes.json();
      setMeId(j.user?.id ?? null);
    } else {
      setMeId(null);
    }

    const res = await fetch(`/api/listings/${listingId}/service-booking`, { credentials: "same-origin" });
    const data = res.ok ? await res.json() : null;
    setBooking(data as BookingState | null);
    setLoading(false);

    // Fetch loyalty info (non-blocking)
    fetch("/api/loyalty", { credentials: "same-origin" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.reward) {
          setLoyaltyHint({
            bookingsUntil: d.reward.bookingsUntilReward,
            discountPct: d.reward.discountPct,
          });
        }
      })
      .catch(() => {});
  }, [listingId, isService]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isService) return;
    const onContact = () => void load();
    window.addEventListener("tianguis:listing-contact", onContact);
    return () => window.removeEventListener("tianguis:listing-contact", onContact);
  }, [load, isService]);

  // Refetch when user returns to the tab (fixes stale state after sending a message)
  useEffect(() => {
    if (!isService) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load, isService]);

  // When step 1 completes, scroll the pay section into view
  useEffect(() => {
    const contacted = Boolean(booking?.contactedInApp || booking?.whatsappAcked);
    if (contacted && !prevContacted.current) {
      const el = document.getElementById("booking-section");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevContacted.current = contacted;
  }, [booking?.contactedInApp, booking?.whatsappAcked]);

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const startCheckout = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear pago");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (!isService) return null;

  if (loading || meId === undefined) {
    return (
      <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 text-sm text-[#6B7280]">
        Cargando reservas…
      </div>
    );
  }

  if (sellerId && meId === sellerId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">Tu servicio</p>
        <p className="text-amber-800">
          Los clientes deben escribirte por mensajes en la app y pagar la tarifa de servicio antes de recibir tu número de contacto.
        </p>
      </div>
    );
  }

  if (!meId) {
    return (
      <div className="rounded-xl border border-[#E5E0D8] bg-[#F4F0EB] p-4">
        <p className="text-sm font-semibold text-[#1C1917] mb-2">Reservar este servicio</p>
        <p className="text-xs text-[#6B7280] mb-3">
          Inicia sesión, platica con el proveedor y paga la tarifa de servicio para obtener su contacto directo.
        </p>
        <Link
          href={`/auth/login?returnTo=${encodeURIComponent(`/listing/${listingId}`)}`}
          className="inline-block px-4 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold"
        >
          Iniciar sesión para continuar
        </Link>
      </div>
    );
  }

  if (!booking?.isService) return null;

  const contacted = booking.contactedInApp || booking.whatsappAcked;
  const hasPaid = booking.hasPaidBooking;

  // STEP 3: Contact revealed — buyer has paid
  if (hasPaid && booking.revealedPhone) {
    const digits = booking.revealedPhone.replace(/\D/g, "");
    const displayPhone = booking.revealedPhone.replace(
      /(\d{2})(\d{2,3})(\d{3})(\d{4})/,
      "+$1 $2 $3 $4"
    );

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-200 bg-emerald-100">
          <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
            <span className="text-lg">✓</span> Servicio reservado
          </h3>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-emerald-800">
            Ya pagaste la tarifa de servicio. Aquí está el contacto del proveedor:
          </p>
          <div className="bg-white rounded-xl p-3 border border-emerald-200">
            <p className="text-xs text-[#6B7280] mb-1">Teléfono / WhatsApp</p>
            <p className="text-lg font-bold text-[#1C1917] tracking-wide">{displayPhone}</p>
          </div>
          {booking.revealedWhatsappUrl && (
            <a
              href={booking.revealedWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              style={{ background: "#25D366", color: "white" }}
            >
              Contactar por WhatsApp
            </a>
          )}
          <a
            href={`tel:+${digits}`}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-[#1B4332] text-[#1B4332] hover:bg-[#ECFDF5]"
          >
            Llamar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E0D8] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E0D8] bg-[#F4F0EB]">
        <h3 className="text-sm font-bold text-[#1C1917]">Reservar servicio</h3>
        <p className="text-xs text-[#6B7280] mt-1">
          El precio del anuncio (ej. $52) lo acuerdas con el proveedor. Aquí solo pagas la{" "}
          <strong>tarifa de la plataforma</strong> (~comisión, mín. $5 MXN) para desbloquear su WhatsApp.
        </p>
      </div>

      {/* Progress steps */}
      <div className="px-4 py-3 space-y-2 text-xs text-[#374151]">
        <div className="flex items-center gap-2">
          <span className={contacted ? "text-emerald-600 font-bold" : "text-[#9CA3AF]"}>
            {contacted ? "✓" : "1"}
          </span>
          <span className={contacted ? "text-emerald-700 font-medium" : ""}>
            Envía un mensaje al proveedor en la app
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={hasPaid ? "text-emerald-600 font-bold" : "text-[#9CA3AF]"}>
            {hasPaid ? "✓" : "2"}
          </span>
          <span>
            Paga la tarifa de servicio ({formatMXN(booking.commissionAmountCents)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={hasPaid ? "text-emerald-600 font-bold" : "text-[#9CA3AF]"}>
            {hasPaid ? "✓" : "3"}
          </span>
          <span>Recibe el contacto directo (WhatsApp / teléfono)</span>
        </div>
      </div>

      {/* STEP 1: Not yet contacted — tell buyer to use chat above */}
      {!contacted && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Paso 1:</strong> En <strong>Mensajes en la app</strong> (recuadro de arriba), escribe al
              proveedor y envía el mensaje. <strong>Después de enviarlo</strong>, aparece aquí abajo el botón verde{" "}
              <strong>Pagar … y obtener contacto</strong> (no pagas los $52 del anuncio en Stripe — solo la tarifa
              indicada en el paso 2).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void manualRefresh()}
            disabled={refreshing || loading}
            className="w-full py-2.5 rounded-xl border border-[#1B4332] text-[#1B4332] text-xs font-semibold hover:bg-[#ECFDF5] disabled:opacity-50"
          >
            {refreshing ? "Actualizando…" : "Ya envié mi mensaje — actualizar"}
          </button>
        </div>
      )}

      {/* STEP 2: Contacted, ready to pay */}
      {contacted && !hasPaid && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              <strong>Paso 2:</strong> Paga la tarifa de servicio para recibir el número de contacto del proveedor.
            </p>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Nota para tu reserva (opcional): fecha, hora, detalles…"
            className="w-full rounded-xl border border-[#E5E0D8] px-3 py-2 text-sm outline-none focus:border-[#1B4332]"
          />

          <div className="bg-[#F4F0EB] rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B7280]">Tarifa de servicio ({booking.commissionPct}%)</p>
              <p className="text-lg font-bold text-[#1C1917]">{formatMXN(booking.commissionAmountCents)}</p>
            </div>
            <span className="text-xs text-[#6B7280]">MXN</span>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? "Procesando…" : `Pagar ${formatMXN(booking.commissionAmountCents)} y obtener contacto`}
          </button>

          <p className="text-center text-xs text-[#6B7280]">
            Pago seguro con Stripe. Al pagar recibirás el WhatsApp/teléfono del proveedor.
          </p>

          {loyaltyHint && (
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-xl p-3 text-center">
              {loyaltyHint.bookingsUntil === 0 ? (
                <p className="text-xs font-semibold text-white">
                  🎉 ¡Esta reserva tiene {loyaltyHint.discountPct}% de descuento por tu lealtad!
                </p>
              ) : (
                <p className="text-xs text-white/90">
                  ⭐ {loyaltyHint.bookingsUntil} reserva{loyaltyHint.bookingsUntil !== 1 ? "s" : ""} más
                  para obtener {loyaltyHint.discountPct}% de descuento
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {msg && (
        <p className={`px-4 pb-3 text-xs ${msg.includes("Error") || msg.includes("Primero") ? "text-red-600" : "text-emerald-700"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
