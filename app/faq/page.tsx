import type { Metadata } from "next";
import Link from "next/link";
import { langFromParam, hrefWithLang, type Lang } from "@/lib/i18n-lang";

export const metadata: Metadata = {
  title: "FAQ | AISaravanna",
  description:
    "Frequently asked questions for service providers, buyers, payments, trust, messaging, and safety on AISaravanna.",
  robots: { index: true, follow: true },
};

type FaqItem = { q: string; a: string[] };

type FaqCopy = {
  title: string;
  intro: string;
  sections: { heading: string; items: FaqItem[] }[];
  disclaimer: string;
  policyLinks: { terms: string; privacy: string };
  langSwitch: { label: string; other: string; otherLang: Lang };
};

const COPY: Record<"en" | "es", FaqCopy> = {
  en: {
    title: "Frequently asked questions",
    intro:
      "Quick answers about using AISaravanna as a service provider or client, how payments and verification work, and how we encourage safe, on-platform transactions. For binding rules, see our Terms and Privacy Policy.",
    sections: [
      {
        heading: "Service providers (sellers)",
        items: [
          {
            q: "How does the seller or service-provider flow work?",
            a: [
              "Sign in with WhatsApp OTP to create a verified account tied to your phone number.",
              "Create and publish listings for services you offer (titles, descriptions, pricing, availability, photos as the product allows).",
              "Respond to inquiries and bookings through the profile and messaging experience so buyers can reach you in one place.",
              "Honor appointments and deliver services as described. Keep your listings accurate and update them when your offer changes.",
            ],
          },
          {
            q: "What verification or badges can buyers see?",
            a: [
              "Trust signals can include verification that you completed signup (including phone OTP), optional document checks when enabled (for example DL or business-related verification where the product exposes them), and admin review for certain listings (for example verified service listings where that flag is shown).",
              "Badges and labels summarize trust at a glance—they do not replace your obligation to behave honestly or your compliance with laws and platform rules.",
            ],
          },
        ],
      },
      {
        heading: "Clients (buyers)",
        items: [
          {
            q: "How does the buyer or client flow work?",
            a: [
              "Browse categories and search locally; use listings, filters, and maps as available to find providers.",
              "Read listing details, trust signals, and any reviews shown on listings before booking or contacting a provider.",
              "Use in-app messaging to clarify scope, time, and price before you commit. Complete payment flows offered by the platform (for example Stripe checkout) instead of unsolicited off-platform wires when checkout is enabled.",
              "After service delivery, you may be able to leave reviews or ratings where the product supports it—be factual and respectful.",
            ],
          },
        ],
      },
      {
        heading: "Payments",
        items: [
          {
            q: "How do payments work on AISaravanna?",
            a: [
              "Many purchases use Stripe (or another processor we configure) at checkout. You see charges, receipts, and status in line with standard card or wallet flows.",
              "Fees, taxes shown at checkout, and seller payouts (including Connect payouts when configured) depend on Stripe settings and your agreement with us—the exact behavior follows what is wired in your deployment.",
              "If checkout is unavailable for an item, treat that as provisional and follow any instructions in the listing or Terms until payment is formally completed on-platform.",
            ],
          },
        ],
      },
      {
        heading: "Privacy",
        items: [
          {
            q: "What personal data does the platform collect and why?",
            a: [
              "We collect data you submit to operate the marketplace: contact and account data (such as phone for OTP), messages between users, listings, booking-related data, and payment metadata through our processors.",
              "We use this information to authenticate users, facilitate sell/buy/booking workflows, comply with legal duties, detect abuse, and improve the service—see our Privacy Policy for details.",
              "Avoid sharing unrelated sensitive data (for example unrelated financial or health histories) unless needed for the transaction and appropriate safeguards apply.",
            ],
          },
          {
            q: "Keep communication and commitments on-platform",
            a: [
              "Use AISaravanna messaging and documented checkout flows so there is an auditable trail for disputes and support.",
              "Moving the entire negotiation off-platform to avoid fees or oversight increases fraud risk for both sides. Parties who bypass the platform assume extra risk.",
            ],
          },
        ],
      },
      {
        heading: "Trust & verification",
        items: [
          {
            q: "What does “verified provider” mean?",
            a: [
              "Verification can mean multiple things: verified phone at signup; optional verification documents when we enable them; and admin-checked listings or seller flags visible in the UI.",
              "Verifications reduce certain risks but cannot guarantee honesty, quality, licensing, insurance, or safety of every job site—clients should still vet scope, licensing where required (trades/professional services), references, and insurance as appropriate.",
            ],
          },
          {
            q: "Reviews, comments, and badges",
            a: [
              "Where reviews exist, they reflect user-submitted opinions, not AISaravanna’s endorsement.",
              "We may moderate content that violates our Terms (for example harassment, fake reviews, or illegal activity). Repeated abuse may lead to suspension.",
              "Trust badges summarize signals we can verify in product; treat them alongside reviews and your own judgment.",
            ],
          },
        ],
      },
      {
        heading: "Avoiding scams and fraud",
        items: [
          {
            q: "How can I reduce fraud risk?",
            a: [
              "Prefer providers with visible trust signals and completed verification where shown.",
              "Do not pay strangers through gift cards, prepaid cards, unrelated apps, or “friends & family” transfers when the legitimate flow is Stripe checkout—or when the Terms require on-platform settlement.",
              "Be suspicious of pressure to rush, prices far below market, requests to bypass messaging, duplicate profiles, new accounts promising guaranteed returns, or anyone who insists you share banking PINs/codes/passwords.",
              "Report suspicious listings, messages, or users through support pathways we provide.",
            ],
          },
        ],
      },
      {
        heading: "In-app messaging",
        items: [
          {
            q: "How should messaging be used?",
            a: [
              "Messaging exists to negotiate and coordinate legitimate buy/sell and service engagements on AISaravanna.",
              "Do not use it for spam, harassment, solicitation unrelated to a reasonable transaction, or to collect data for unrelated marketing without consent.",
              "Misuse may result in moderation or suspension under our Terms.",
            ],
          },
        ],
      },
      {
        heading: "Facebook, Instagram & WhatsApp",
        items: [
          {
            q: "I found a provider on Instagram or Facebook—where do I book?",
            a: [
              "Facebook and Instagram are great for discovery and social proof; many NJ providers share their work there.",
              "When you are ready to hire, open their AISaravanna listing or profile link (share it in a group chat or WhatsApp). Quote, deposit, and payment stay in the app.",
              "WhatsApp and SMS from AISaravanna are alerts and coordination—they deep-link back to your booking, not a substitute for checkout.",
            ],
          },
        ],
      },
    ],
    disclaimer:
      "This FAQ is explanatory only and does not replace the Terms of Use or Privacy Policy, nor does it constitute legal advice. Features (verification types, payouts, messaging, reviews) may evolve by region and configuration.",
    policyLinks: { terms: "Terms of Use", privacy: "Privacy Policy" },
    langSwitch: { label: "Language:", other: "Ver en español", otherLang: "es" },
  },
  es: {
    title: "Preguntas frecuentes",
    intro:
      "Respuestas breves sobre AISaravanna para prestadores de servicios y clientes: pagos, verificación y transacciones seguras en la plataforma. Para reglas vinculantes, consulte Términos y Aviso de privacidad.",
    sections: [
      {
        heading: "Prestadores de servicios (vendedores)",
        items: [
          {
            q: "¿Cómo funciona el flujo de vendedor o prestador?",
            a: [
              "Inicie sesión con OTP por WhatsApp para tener una cuenta vinculada a su teléfono.",
              "Publique anuncios con descripción honesta del servicio, precio y disponibilidad, y fotos cuando aplique.",
              "Responda consultas y reservas a través del perfil y mensajería integrada.",
              "Cumpla citas y servicios como se describe; mantenga los anuncios actualizados.",
            ],
          },
          {
            q: "¿Qué verificación o insignias ven los compradores?",
            a: [
              "Se pueden mostrar teléfono verificado, verificaciones documentales opcionales cuando existan (por ejemplo datos comerciales o de identificación expuestos en la UI), y revisión administrativa para ciertos servicios/listados marcados.",
              "Las insignias resumen confianza; no sustituyen el cumplimiento legal ni la honestidad.",
            ],
          },
        ],
      },
      {
        heading: "Clientes (compradores)",
        items: [
          {
            q: "¿Cómo funciona el flujo del cliente?",
            a: [
              "Explore categorías y búsqueda local según disponibilidades del sitio.",
              "Revise listados, señales de confianza y opiniones antes de contratar.",
              "Use la mensajería para acordar alcance y precio antes de comprometer pagos cuando el checkout esté disponible.",
              "Tras la prestación puede dejar reseñas donde el producto lo permita, con respeto y hechos verificables.",
            ],
          },
        ],
      },
      {
        heading: "Pagos",
        items: [
          {
            q: "¿Cómo funcionan los pagos?",
            a: [
              "Muchos flujos usan Stripe en el checkout; cargos y comprobantes aparecen conforme la configuración desplegada.",
              "Comisiones e impuestos mostrados y pagos a vendedores (incluyendo Stripe Connect cuando esté habilitado) dependen de su entorno Stripe y los términos aplicables.",
              "Si checkout no está disponible, siga lo indicado en el anuncio o en Términos hasta completar pago válido dentro de la plataforma cuando corresponda.",
            ],
          },
        ],
      },
      {
        heading: "Privacidad",
        items: [
          {
            q: "¿Qué datos se recaban y por qué?",
            a: [
              "Datos necesarios para operar el marketplace: cuenta (p. ej. teléfono OTP), mensajes entre usuarios, anuncios, reservas y metadatos de pago mediante procesadores.",
              "Consulte el aviso de privacidad para fines y conservación; no comparta datos sensibles sin necesidad real del servicio.",
            ],
          },
          {
            q: "Mantenga la relación comercial en la plataforma",
            a: [
              "Use mensajería y checkout documentados para rastro y soporte.",
              "Desviar todo fuera del sitio aumenta el riesgo de fraude para ambas partes.",
            ],
          },
        ],
      },
      {
        heading: "Confianza y verificación",
        items: [
          {
            q: "¿Qué significa “proveedor verificado”?",
            a: [
              "Puede combinarse con teléfono verificado, documentos cuando estén habilitados, y revisión/listados marcados.",
              "No garantiza resultado de obra, licencias locales, ni seguros; el cliente debe evaluar alcance profesional donde aplique.",
            ],
          },
          {
            q: "Reseñas, comentarios e insignias",
            a: [
              "Las reseñas son opiniones de usuarios.",
              "Podemos moderar contenido que vulnere Términos; abuso repetido puede implicar suspensión.",
            ],
          },
        ],
      },
      {
        heading: "Evitar estafas y fraude",
        items: [
          {
            q: "¿Cómo reducir el riesgo?",
            a: [
              "Prefiera proveedores con señales de verificación cuando se muestren.",
              "Desconfíe de pagos mediante tarjetas de regalo, envíos urgidos fuera del checkout con Stripe, o datos bancarios/códigos solicitados ilegítimamente.",
              "Reporte conductas sospechosas mediante los canales de soporte disponibles.",
            ],
          },
        ],
      },
      {
        heading: "Mensajería en la aplicación",
        items: [
          {
            q: "Uso esperado del chat",
            a: [
              "Coordine compraventa y prestación de servicios legítimos relacionados con AISaravanna.",
              "Sin spam, acoso ni recolección indebida para marketing ajeno.",
              "El uso indebido puede implicar medidas conforme los Términos.",
            ],
          },
        ],
      },
      {
        heading: "Facebook, Instagram y WhatsApp",
        items: [
          {
            q: "Encontré un proveedor en Instagram o Facebook—¿dónde reservo?",
            a: [
              "Facebook e Instagram sirven para descubrir y ver el trabajo del proveedor; muchos en NJ comparten ahí.",
              "Cuando quieras contratar, abre el enlace de su anuncio o perfil en AISaravanna (compártelo en un grupo o WhatsApp). Cotización, depósito y pago quedan en la app.",
              "WhatsApp y SMS de AISaravanna son avisos y coordinación—vuelven a tu reserva, no sustituyen el checkout.",
            ],
          },
        ],
      },
    ],
    disclaimer:
      "Este texto es aclaratorio; no sustituye Términos ni Aviso de privacidad ni asesoría legal. Funciones pueden variar por región y configuración.",
    policyLinks: { terms: "Términos de uso", privacy: "Aviso de privacidad" },
    langSwitch: { label: "Idioma:", other: "View in English", otherLang: "en" },
  },
};

function resolveFaqLang(raw: string | undefined): "en" | "es" {
  const l = langFromParam(raw);
  return l === "es" ? "es" : "en";
}

export default function FaqPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const ui = resolveFaqLang(searchParams?.lang);
  const c = COPY[ui];
  const otherHref = hrefWithLang("/faq", c.langSwitch.otherLang);

  return (
    <main className="min-h-0 flex-1 bg-[#FDF8F1]">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-16">
        <p className="text-sm text-[#6B7280] mb-2">
          <Link href={hrefWithLang("/", ui)} className="text-[#1B4332] font-semibold hover:underline">
            ← {ui === "es" ? "Inicio" : "Home"}
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <h1 className="text-2xl font-serif font-bold text-[#1B4332]">{c.title}</h1>
          <p className="text-xs text-[#6B7280]">
            <span className="mr-2">{c.langSwitch.label}</span>
            <Link href={otherHref} className="text-[#1B4332] font-semibold hover:underline">
              {c.langSwitch.other}
            </Link>
          </p>
        </div>
        <p className="text-sm text-[#1C1917] leading-relaxed mb-8">{c.intro}</p>

        <div className="space-y-10">
          {c.sections.map((sec, secIdx) => (
            <section key={sec.heading} aria-labelledby={`faq-sec-${secIdx}`}>
              <h2
                id={`faq-sec-${secIdx}`}
                className="text-lg font-serif font-bold text-[#1B4332] mb-3 pb-2 border-b border-[#E5E0D8]"
              >
                {sec.heading}
              </h2>
              <div className="space-y-2">
                {sec.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-[#E5E0D8] bg-white/80 px-4 py-1 shadow-sm [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="cursor-pointer list-none py-3 pr-8 font-semibold text-[#1C1917] text-sm leading-snug relative marker:content-none after:content-['+'] after:absolute after:right-0 after:text-[#78350F] group-open:after:content-['−']">
                      {item.q}
                    </summary>
                    <div className="pb-4 text-[#374151] text-sm leading-relaxed space-y-2 border-t border-[#F4F0EB] mt-2 pt-3">
                      {item.a.map((p, pi) => (
                        <p key={pi}>{p}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 p-4 rounded-xl bg-[#FFFBF0] border border-[#D4A017]/35 text-sm text-[#1C1917] space-y-3">
          <p className="font-semibold text-[#78350F]">
            <Link href={hrefWithLang("/terms", ui)} className="underline hover:text-[#1B4332]">
              {c.policyLinks.terms}
            </Link>
            {" · "}
            <Link href={hrefWithLang("/privacy", ui)} className="underline hover:text-[#1B4332]">
              {c.policyLinks.privacy}
            </Link>
          </p>
          <p className="text-xs text-[#6B7280] leading-relaxed">{c.disclaimer}</p>
        </div>
      </div>
    </main>
  );
}
