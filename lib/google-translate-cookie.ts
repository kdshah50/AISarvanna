/** Google Website Translator cookie (client-only). */

export type GoogleTranslateTarget = "hi" | "gu";

export function parseGoogtransTarget(): GoogleTranslateTarget | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!m?.[1]) return null;
  const raw = decodeURIComponent(m[1].trim());
  const segs = raw.split("/").filter(Boolean);
  const last = segs[segs.length - 1]?.toLowerCase();
  if (last === "hi" || last === "gu") return last;
  return null;
}

/** Source is usually `en` for our primary HTML `lang`. */
export function setGoogtransCookie(from: "en", to: GoogleTranslateTarget): void {
  const val = encodeURIComponent(`/${from}/${to}`);
  document.cookie = `googtrans=${val};path=/;max-age=31536000;SameSite=Lax`;
}

export function clearGoogtransCookies(): void {
  if (typeof document === "undefined") return;
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=;path=/;${expires};SameSite=Lax`;
  const h = typeof location !== "undefined" ? location.hostname : "";
  if (h) {
    document.cookie = `googtrans=;path=/;domain=${h};${expires};SameSite=Lax`;
    document.cookie = `googtrans=;path=/;domain=.${h};${expires};SameSite=Lax`;
  }
}
