import type { Lang } from "@/lib/i18n-lang";

export function listingTitle(
  row: { title_es?: string | null; title_en?: string | null },
  lang: Lang
): string {
  const es = (row.title_es ?? "").trim();
  const en = (row.title_en ?? "").trim();
  if (lang === "en") return en || es;
  return es || en;
}

export function listingDescription(
  row: { description_es?: string | null; description_en?: string | null },
  lang: Lang
): string {
  const es = (row.description_es ?? "").trim();
  const en = (row.description_en ?? "").trim();
  if (lang === "en") return en || es;
  return es || en;
}
