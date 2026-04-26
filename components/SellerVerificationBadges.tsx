import type { Lang } from "@/lib/i18n-lang";

type Props = {
  trustBadge: string;
  ineVerified: boolean;
  phoneVerified: boolean;
  lang: Lang;
  /** Listing approved in admin (`listings.is_verified`) — show chip if no stronger signal. */
  platformListingVerified?: boolean;
  /** Slightly larger text on listing detail vs grid cards */
  size?: "sm" | "md";
};

function tierLabel(tier: "bronze" | "gold" | "diamond", lang: Lang): string {
  if (lang === "en") {
    return { bronze: "Bronze", gold: "Gold", diamond: "Diamond" }[tier];
  }
  return { bronze: "Bronce", gold: "Oro", diamond: "Diamante" }[tier];
}

function tierClass(tier: "bronze" | "gold" | "diamond"): string {
  switch (tier) {
    case "bronze":
      return "bg-amber-50 text-amber-900 border-amber-200/90";
    case "gold":
      return "bg-yellow-50 text-yellow-800 border-yellow-200/90";
    case "diamond":
      return "bg-blue-50 text-blue-800 border-blue-200/90";
  }
}

/**
 * Seller trust chips: tier (Bronce/Oro/Diamante), optional INE, Teléfono when no tier, platform fallback.
 */
export function SellerVerificationBadges({
  trustBadge,
  ineVerified,
  phoneVerified,
  lang,
  platformListingVerified = false,
  size = "sm",
}: Props) {
  const textSm = size === "sm" ? "text-[10px]" : "text-xs";
  const padSm = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const iconSm = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  const b = (trustBadge ?? "none").toLowerCase();
  const tier = b === "bronze" || b === "gold" || b === "diamond" ? b : null;

  const parts: JSX.Element[] = [];

  if (tier) {
    const title =
      lang === "en"
        ? `${tierLabel(tier, lang)} trust level on Naranjogo`
        : `Nivel de confianza: ${tierLabel(tier, lang)}`;
    parts.push(
      <span
        key="tier"
        className={`${textSm} font-bold ${padSm} rounded-md border shrink-0 ${tierClass(tier)}`}
        title={title}
      >
        {tierLabel(tier, lang)}
      </span>
    );
  }

  if (ineVerified) {
    const title = lang === "en" ? "Verified: government ID reviewed (INE)" : "Verificado: INE revisada";
    parts.push(
      <span
        key="ine"
        className={`inline-flex items-center gap-0.5 ${textSm} font-bold ${padSm} rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300/80 shrink-0`}
        title={title}
      >
        <span className="text-emerald-600" aria-hidden>
          ✓
        </span>
        INE
      </span>
    );
  }

  // Teléfono: show when phone is verified and we are not already showing INE.
  // If seller has a tier (Bronce+), phone is implied for bronze; for gold/diamond still optional —
  // hide duplicate when tier exists to keep cards readable (tier + INE is enough).
  if (phoneVerified && !ineVerified && !tier) {
    const title =
      lang === "en" ? "Verified: phone number (WhatsApp)" : "Verificado: número (WhatsApp)";
    const label = lang === "en" ? "Telephone" : "Teléfono";
    parts.push(
      <span
        key="phone"
        className={`inline-flex items-center gap-0.5 ${textSm} font-bold ${padSm} rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0`}
        title={title}
      >
        <span className="text-emerald-600" aria-hidden>
          ✓
        </span>
        {label}
        <svg className={`${iconSm} shrink-0 opacity-80`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
      </span>
    );
  }

  if (parts.length === 0 && platformListingVerified) {
    const title =
      lang === "en"
        ? "Listing reviewed and approved on Naranjogo"
        : "Anuncio revisado y aprobado en Naranjogo";
    const label = lang === "en" ? "Verified" : "Verificado";
    parts.push(
      <span
        key="platform"
        className={`inline-flex items-center gap-0.5 ${textSm} font-bold ${padSm} rounded-md bg-teal-50 text-teal-800 border border-teal-200/90 shrink-0`}
        title={title}
      >
        <span className="text-teal-600" aria-hidden>
          ✓
        </span>
        {label}
      </span>
    );
  }

  if (parts.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">{parts}</span>
  );
}
