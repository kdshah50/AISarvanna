"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTianguisTokenFromCookie } from "@/lib/client-auth";
import GuaranteeBadge from "@/components/GuaranteeBadge";

type Booking = {
  id: string;
  listing_id: string;
  seller_id: string;
  commission_amount_cents: number;
  payment_status: string;
  paid_at: string | null;
  status: string;
  created_at: string;
  listing_title: string;
  seller_name: string;
};

function formatMXN(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Hace 1 mes";
  if (months < 12) return `Hace ${months} meses`;
  return `Hace más de 1 año`;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebookingId, setRebookingId] = useState<string | null>(null);
  const [reminderMsg, setReminderMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = getTianguisTokenFromCookie();
    if (!token) {
      router.push("/auth/login?returnTo=/my-bookings");
      return;
    }

    fetch("/api/bookings?status=paid", { credentials: "same-origin" })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(data => {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const scheduleReminder = async (booking: Booking) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setReminderMsg(prev => ({ ...prev, [booking.id]: "✓ Te recordaremos en 3 meses" }));
    } catch (e: unknown) {
      setReminderMsg(prev => ({ ...prev, [booking.id]: e instanceof Error ? e.message : "Error" }));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/profile" className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">
          ← Mi perfil
        </Link>

        <h1 className="font-serif text-2xl font-bold text-[#1B4332] mt-4 mb-2">Mis reservas</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Historial de servicios contratados. Puedes volver a reservar con un solo clic.
        </p>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-[#6B7280] mb-4">Aún no tienes reservas completadas.</p>
            <Link href="/" className="inline-block text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors">
              Explorar servicios →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map(b => {
              const ago = timeAgo(b.paid_at ?? b.created_at);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-[#E5E0D8] p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1C1917]">{b.listing_title}</h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        Proveedor: {b.seller_name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#1B4332]">{formatMXN(b.commission_amount_cents)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{ago}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/listing/${b.listing_id}`}
                      className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold text-center hover:bg-[#2D6A4F] transition-colors"
                    >
                      Volver a reservar →
                    </Link>

                    <button
                      onClick={() => scheduleReminder(b)}
                      disabled={!!reminderMsg[b.id]}
                      className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-[#E5E0D8] text-xs font-semibold text-[#6B7280] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors disabled:opacity-50"
                    >
                      {reminderMsg[b.id] ?? "⏰ Recordarme"}
                    </button>
                  </div>

                  {reminderMsg[b.id] && reminderMsg[b.id].startsWith("✓") && (
                    <p className="text-xs text-emerald-600 mt-2">{reminderMsg[b.id]}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <GuaranteeBadge compact />
        </div>
      </div>
    </main>
  );
}
