export type Lang = "en" | "es";

/** US-first product: English is default; use `?lang=es` or the header toggle for Spanish. */
export const DEFAULT_LANG: Lang = "en";

/** Browser persistence for language preference (profile, bookings, etc.). */
export const LANG_STORAGE_KEY = "aisaravanna_lang";

/** Older keys — checked in order when reading preference */
/** Prior spellings / keys users may still have in localStorage */
const LEGACY_LANG_KEYS = ["aisarvanna_lang", "aisarvana_lang", "naranjo_lang"] as const;

/**
 * Resolve language from `?lang=` query. Unknown or missing → English.
 */
export function langFromParam(raw: string | null | undefined): Lang {
  const v = raw?.trim();
  if (v === "es") return "es";
  if (v === "en") return "en";
  return DEFAULT_LANG;
}

/** Read stored language preference; migrates legacy keys. */
export function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    for (const k of [LANG_STORAGE_KEY, ...LEGACY_LANG_KEYS]) {
      const v = localStorage.getItem(k);
      if (v === "en" || v === "es") return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** @deprecated use readStoredLang() — kept for imports that only need the key name */
export const LEGACY_LANG_STORAGE_KEY_AISARVANA = "aisarvana_lang";

/** @deprecated use readStoredLang() */
export const LEGACY_LANG_STORAGE_KEY = "naranjo_lang";
