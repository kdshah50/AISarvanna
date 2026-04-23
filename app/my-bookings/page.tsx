"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTianguisTokenFromCookie } from "@/lib/client-auth";
import GuaranteeBadge from "@/components/GuaranteeBadge";
import RoutineHabitsCard from "@/components/RoutineHabitsCard";

type Booking = {
  id: string;
  listing_id: string;
  seller_id: string;
  commission_amount_cents: number;
  payment_status: string;
  paid_at: string | null;
  status: string;
  created_at: string;
  has_review?: boolean;
  package_session_count?: number | null;
  listing_title: string;
  seller_name: string;
};

function formatMXN(cents: number, lang: "es" | "en") {
  return new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeAgo(dateStr: string, lang: "es" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (lang === "en") {
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return "1 month ago";
    if (months < 12) return `${months} months ago`;
    return "Over a year ago";
  }
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Hace 1 mes";
  if (months < 12) return `Hace ${months} meses`;
  return `Hace más de 1 año`;
}

function ReviewBlock({
  booking,
  lang,
  onDone,
}: {
  booking: Booking;
  lang: "es" | "en";
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const t =
    lang === "es"
      ? {
          title: "Valorar servicio",
          placeholder: "Comentario opcional",
          submit: "Enviar reseña",
        }
      : {
          title: "Rate this service",
          placeholder: "Optional comment",
          submit: "Submit review",
        };

  const submit = async () => {
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E5E0D8]">
      <p className="text-xs font-semibold text-[#1C1917] mb-2">{t.title}</p>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="text-2xl leading-none text-amber-500 hover:scale-110 transition-transform"
            aria-label={`${n} stars`}
          >
            {n <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t.placeholder}
        className="w-full text-xs border border-[#E5E0D8] rounded-xl px-3 py-2 mb-2 outline-none focus:border-[#1B4332]"
        rows={2}
        maxLength={1000}
      />
      {err && <p className="text-xs text-red-600 mb-1">{err}</p>}
      <button
        type="button"
        disabled={submitting || rating < 1}
        onClick={() => void submit()}
        className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold disabled:opacity-40"
      >
        {submitting ? "…" : t.submit}
      </button>
    </div>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderMsg, setReminderMsg] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<"es" | "en">("es");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("naranjo_lang");
      if (stored === "en" || stored === "es") setLang(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const token = getTianguisTokenFromCookie();
    if (!token) {
      router.push("/auth/login?returnTo=/my-bookings");
      return;
    }

    fetch("/api/bookings?status=paid", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((data) => {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const t =
    lang === "es"
      ? {
          back: "← Mi perfil",
          title: "Mis reservas",
          subtitle: "Historial de servicios, reseñas y recordatorios. Vuelve a reservar en un clic.",
          emptyTitle: "Aún no tienes reservas completadas.",
          explore: "Explorar servicios →",
          rebook: "Volver a reservar →",
          remind: "⏰ Recordarme",
          reviewed: "Reseña enviada",
        }
      : {
          back: "← My profile",
          title: "My bookings",
          subtitle: "Service history, reviews, and reminders. Rebook in one tap.",
          emptyTitle: "You don’t have completed bookings yet.",
          explore: "Browse services →",
          rebook: "Book again →",
          remind: "⏰ Remind me",
          reviewed: "Review submitted",
        };

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
      setReminderMsg((prev) => ({
        ...prev,
        [booking.id]: lang === "es" ? "✓ Te recordaremos en 3 meses" : "✓ We’ll remind you in 3 months",
      }));
    } catch (e: unknown) {
      setReminderMsg((prev) => ({
        ...prev,
        [booking.id]: e instanceof Error ? e.message : "Error",
      }));
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
        <div className="flex items-center justify-between mb-4">
          <Link href="/profile" className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">
            {t.back}
          </Link>
          <div className="flex bg-[#F4F0EB] rounded-lg p-1 gap-1">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l);
                  try {
                    localStorage.setItem("naranjo_lang", l);
                  } catch {
                    /* ignore */
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  lang === l ? "bg-white text-[#1B4332] shadow-sm" : "text-[#6B7280]"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <h1 className="font-serif text-2xl font-bold text-[#1B4332] mt-0 mb-2">{t.title}</h1>
        <p className="text-sm text-[#6B7280] mb-4">{t.subtitle}</p>

        <div className="mb-6">
          <RoutineHabitsCard lang={lang} />
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-[#6B7280] mb-4">{t.emptyTitle}</p>
            <Link
              href="/"
              className="inline-block text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors"
            >
              {t.explore}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const ago = timeAgo(b.paid_at ?? b.created_at, lang);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-[#E5E0D8] p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1C1917]">{b.listing_title}</h3>
                      {b.package_session_count != null && b.package_session_count >= 2 && (
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          📦 {lang === "es" ? "Paquete" : "Package"}: {b.package_session_count}{" "}
                          {lang === "es" ? "sesiones" : "sessions"}
                        </p>
                      )}
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {lang === "es" ? "Proveedor" : "Provider"}: {b.seller_name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#1B4332]">{formatMXN(b.commission_amount_cents, lang)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{ago}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/listing/${b.listing_id}`}
                      className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold text-center hover:bg-[#2D6A4F] transition-colors"
                    >
                      {t.rebook}
                    </Link>

                    <button
                      type="button"
                      onClick={() => scheduleReminder(b)}
                      disabled={reminderMsg[b.id]?.startsWith("✓")}
                      className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-[#E5E0D8] text-xs font-semibold text-[#6B7280] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors disabled:opacity-50"
                    >
                      {reminderMsg[b.id]?.startsWith("✓") ? reminderMsg[b.id] : t.remind}
                    </button>
                  </div>

                  {b.has_review ? (
                    <p className="text-xs text-emerald-600 mt-3">✓ {t.reviewed}</p>
                  ) : (
                    <ReviewBlock
                      booking={b}
                      lang={lang}
                      onDone={() => {
                        setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, has_review: true } : x)));
                      }}
                    />
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
