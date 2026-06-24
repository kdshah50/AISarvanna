"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n-lang";

export default function ShareListingButton({
  lang,
  title,
  shareUrl,
}: {
  lang: Lang;
  title: string;
  shareUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const label =
    lang === "es" ? "Compartir" : lang === "hi" ? "शेयर" : lang === "gu" ? "શેર" : "Share";
  const copiedLabel =
    lang === "es" ? "Enlace copiado" : lang === "hi" ? "लिंक कॉपी" : lang === "gu" ? "લિંક કોપી" : "Link copied";

  const share = async () => {
    const text =
      lang === "es"
        ? `Mira este servicio en AISaravanna: ${title}`
        : `Check out this service on AISaravanna: ${title}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        /* fall through to copy */
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(lang === "es" ? "Copia este enlace:" : "Copy this link:", shareUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E5E0D8] text-[#374151] hover:bg-[#F4F0EB] transition-colors shrink-0"
      aria-live="polite"
    >
      {copied ? `✓ ${copiedLabel}` : `🔗 ${label}`}
    </button>
  );
}
