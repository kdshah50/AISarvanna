import type { CommunityLane } from "@/lib/community-lane";
import type { Lang } from "@/lib/i18n-lang";
import { DEFAULT_LANG } from "@/lib/i18n-lang";

/** Languages selectable for a browse lane — Latino stays English/Español; South Asian adds Hindi/Gujarati. */
export function langsForLane(lane: CommunityLane | null): readonly Lang[] {
  if (lane === "latino") return ["en", "es"];
  return ["en", "es", "hi", "gu"];
}

export function clampLangForLane(lang: Lang, lane: CommunityLane | null): Lang {
  const allowed = langsForLane(lane);
  return allowed.includes(lang) ? lang : DEFAULT_LANG;
}

export function parseUiLang(raw: unknown): Lang | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "en" || v === "es" || v === "hi" || v === "gu") return v;
  return null;
}
