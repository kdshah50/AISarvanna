"use client";

import { useState, useEffect, useCallback } from "react";
type Lang = "es" | "en";

export default function FavoriteButton({ listingId, lang = "es" }: { listingId: string; lang?: Lang }) {
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const t =
    lang === "es"
      ? { add: "Guardar", remove: "Guardado" }
      : { add: "Save", remove: "Saved" };

  useEffect(() => {
    fetch(`/api/favorites?listingId=${encodeURIComponent(listingId)}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { favorited: false }))
      .then((d) => setFavorited(!!d.favorited))
      .catch(() => setFavorited(false));
  }, [listingId]);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (favorited) {
        const res = await fetch(`/api/favorites?listingId=${encodeURIComponent(listingId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (res.ok) setFavorited(false);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (res.status === 401) {
          window.location.href = `/auth/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`;
          return;
        }
        if (res.ok) setFavorited(true);
      }
    } finally {
      setLoading(false);
    }
  }, [favorited, listingId]);

  if (favorited === null) {
    return (
      <span className="inline-block w-9 h-9 rounded-full bg-[#F4F0EB] animate-pulse" aria-hidden />
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-colors
        border-[#E5E0D8] bg-white text-[#374151] hover:border-[#1B4332] hover:text-[#1B4332] disabled:opacity-50"
      aria-pressed={favorited}
    >
      {favorited ? "♥" : "♡"} {favorited ? t.remove : t.add}
    </button>
  );
}
