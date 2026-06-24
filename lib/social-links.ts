/** Normalize provider social links for storage and display. */

export type ProviderSocialLinks = {
  facebookUrl: string | null;
  instagramHandle: string | null;
};

const FB_HOSTS = /^(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)$/i;

export function normalizeFacebookUrl(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let urlStr = s;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr.replace(/^\/\//, "")}`;
  }

  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!FB_HOSTS.test(u.hostname)) return null;
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

/** Accepts @handle, full instagram.com URL, or plain username. */
export function normalizeInstagramHandle(raw: unknown): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  if (/^https?:\/\//i.test(s) || s.includes("instagram.com")) {
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      const user = parts.find((p) => p !== "p" && p !== "reel" && p !== "stories") ?? parts[0];
      s = user ?? "";
    } catch {
      return null;
    }
  }

  s = s.replace(/^@+/, "").trim().toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(s)) return null;
  return s;
}

export function instagramProfileUrl(handle: string | null | undefined): string | null {
  const h = normalizeInstagramHandle(handle);
  return h ? `https://www.instagram.com/${h}/` : null;
}

export function providerSocialFromRow(row: {
  facebook_url?: string | null;
  instagram_handle?: string | null;
} | null | undefined): ProviderSocialLinks {
  if (!row) return { facebookUrl: null, instagramHandle: null };
  return {
    facebookUrl: normalizeFacebookUrl(row.facebook_url) ?? null,
    instagramHandle: normalizeInstagramHandle(row.instagram_handle) ?? null,
  };
}

export function hasProviderSocial(links: ProviderSocialLinks): boolean {
  return !!(links.facebookUrl || links.instagramHandle);
}
