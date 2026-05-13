"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import { clampLangForLane } from "@/lib/lang-for-lane";
import {
  clearGoogtransCookies,
  parseGoogtransTarget,
  setGoogtransCookie,
  type GoogleTranslateTarget,
} from "@/lib/google-translate-cookie";
import { langFromParam, type Lang } from "@/lib/i18n-lang";

/**
 * Keeps Google Translate in sync with `?lang=`: Hindi/Gujarati turn on whole-page MT;
 * English/Spanish clear it. One full reload when the `googtrans` cookie changes (Google’s model).
 */
function GoogleTranslateCookieSyncInner() {
  const params = useSearchParams();
  const { lane } = useCommunityLane();
  const raw = langFromParam(params.get("lang"));
  const lang: Lang = clampLangForLane(raw, lane);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const want: GoogleTranslateTarget | null = lang === "hi" || lang === "gu" ? lang : null;
    const have = parseGoogtransTarget();

    if (want) {
      if (have === want) return;
      setGoogtransCookie("en", want);
      if (parseGoogtransTarget() === want) window.location.reload();
      return;
    }

    if (have) {
      clearGoogtransCookies();
      if (!parseGoogtransTarget()) window.location.reload();
    }
  }, [lang]);

  return null;
}

export default function GoogleTranslateCookieSync() {
  return (
    <Suspense fallback={null}>
      <GoogleTranslateCookieSyncInner />
    </Suspense>
  );
}
