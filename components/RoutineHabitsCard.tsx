import Link from "next/link";

type Lang = "es" | "en";

/**
 * Static reminder (phase D) — nudges multi-visit and reminders without new DB fields.
 */
export default function RoutineHabitsCard({ lang = "en" }: { lang?: Lang }) {
  const t =
    lang === "es"
      ? {
          title: "Haz de AISaravanna tu rutina",
          body: "Reserva de nuevo con tus proveedores de confianza, usa “Recordarme” en Mis reservas para servicios periódicos, y agrega favoritos para volver en un clic.",
          cta: "Mis reservas",
        }
      : {
          title: "Make AISaravanna your routine",
          body: "Rebook trusted providers, use “Remind me” on My bookings for repeat services, and save favorites to return in one tap.",
          cta: "My bookings",
        };

  return (
    <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDF8F1] rounded-2xl border border-amber-200/80 p-5 mb-5">
      <h3 className="font-serif text-base font-bold text-[#1C1917] mb-2">{t.title}</h3>
      <p className="text-sm text-[#6B7280] leading-relaxed mb-3">{t.body}</p>
      <Link
        href="/my-bookings"
        className="inline-flex text-sm font-semibold text-[#92400E] hover:underline"
      >
        {t.cta} →
      </Link>
    </div>
  );
}
