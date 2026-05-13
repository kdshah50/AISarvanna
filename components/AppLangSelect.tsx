"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import type { CommunityLane } from "@/lib/community-lane";
import { clampLangForLane, langsForLane } from "@/lib/lang-for-lane";
import { hrefWithLang, langFromParam, writeStoredLang, DEFAULT_LANG, type Lang } from "@/lib/i18n-lang";

const LABELS_EN: Record<Lang, string> = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
};

const LABELS_ES: Record<Lang, string> = {
  en: "English",
  es: "Español",
  hi: "हिन्दी (Hindi)",
  gu: "ગુજરાતી (Gujarati)",
};

async function persistUiLangToProfile(lang: Lang): Promise<void> {
  await fetch("/api/auth/me", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ui_lang: lang }),
  }).catch(() => {});
}

type Props = {
  /** Use server-known lane when it should win over context (e.g. profile). */
  laneOverride?: CommunityLane | null;
  /** UI language for labeling the widget when not English — matches current page lang. */
  labelLang?: Lang;
  className?: string;
  id?: string;
};

/** Lane-aware dropdown: English default URL (no `lang`); Latino offers EN/ES; South Asian adds HI/GU. */
export default function AppLangSelect(props: Props) {
  const { laneOverride = undefined, labelLang = "en", id = "aisaravanna-lang-select", className = "" } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lane: ctxLane } = useCommunityLane();
  const lane = laneOverride !== undefined ? laneOverride : ctxLane;
  const allowed = langsForLane(lane);
  const labels = labelLang === "es" ? LABELS_ES : LABELS_EN;

  const raw = langFromParam(searchParams.get("lang"));
  const lang = clampLangForLane(raw, lane);

  return (
    <label className={`inline-flex items-center gap-1.5 shrink-0 ${className}`} title="Language">
      <span className="text-[10px] text-[#6B7280] font-semibold whitespace-nowrap hidden sm:inline">
        {labelLang === "es" ? "Idioma" : "Language"}
      </span>
      <select
        id={id}
        value={lang}
        onChange={(e) => {
          const next = e.target.value as Lang;
          writeStoredLang(next);
          router.push(hrefWithLang(pathname, next, searchParams));
          void persistUiLangToProfile(next);
        }}
        className="rounded-lg border border-[#E5E0D8] bg-[#F4F0EB] text-[10px] sm:text-xs font-bold text-[#1B4332] px-2 py-1.5 max-w-[9.5rem] sm:max-w-none cursor-pointer outline-none focus:ring-2 focus:ring-[#1B4332]/30"
      >
        {allowed.map((code) => (
          <option key={code} value={code}>
            {code === DEFAULT_LANG ? `${labels[code]} (${labelLang === "es" ? "predeterm." : "default"})` : labels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
