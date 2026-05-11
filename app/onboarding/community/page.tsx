"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import { langFromParam } from "@/lib/i18n-lang";
import type { CommunityLane } from "@/lib/community-lane";

function CommunityOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = langFromParam(params.get("lang"));
  const rawReturn = params.get("returnTo") ?? "";
  const returnTo = rawReturn.startsWith("/") ? rawReturn : "/profile";
  /** When set, show picker even if profile already has a lane (switch lanes). */
  const allowChange = params.get("change") === "1";
  const { saveCommunityLane, refresh } = useCommunityLane();

  const [checking, setChecking] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { credentials: "same-origin" }).then(async (r) => {
      if (cancelled) return;
      if (r.status === 401) {
        if (allowChange) {
          setChecking(false);
          return;
        }
        setUnauthorized(true);
        setChecking(false);
        return;
      }
      if (!r.ok) {
        setChecking(false);
        setError(lang === "es" ? "No se pudo cargar tu perfil." : "Could not load your profile.");
        return;
      }
      const d = (await r.json()) as { user?: { community_lane?: string | null } };
      if (
        !allowChange &&
        (d.user?.community_lane === "latino" || d.user?.community_lane === "south_asian")
      ) {
        router.replace(returnTo);
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router, returnTo, lang, allowChange]);

  const pick = async (lane: CommunityLane) => {
    setError("");
    setSaving(true);
    try {
      await saveCommunityLane(lane);
      refresh();
      router.replace(returnTo);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : lang === "es"
            ? "No se pudo guardar. ¿Migración de base de datos aplicada?"
            : "Could not save. Is the database migration applied?"
      );
    } finally {
      setSaving(false);
    }
  };

  const copy = lang === "es"
    ? {
        title: "Personaliza tu mercado",
        sub: "Esto ordena las categorías del inicio. Puedes cambiarlo después en tu perfil.",
        latino: "Comunidad latina / hispana",
        latinoSub: "Servicios y bienes populares en nuestras colonias de NJ y más allá.",
        south: "Comunidad South Asian",
        southSub: "Mehndi, tiffin, bodas, moda étnica y más.",
        wait: "Cargando…",
        busy: "Guardando…",
        login: "Inicia sesión para continuar",
      }
    : {
        title: "Personalize your marketplace",
        sub: "This shapes the category bar on the home page. You can change it later in your profile.",
        latino: "Latino / Hispanic community lane",
        latinoSub: "Services and goods common across our NJ neighborhoods and beyond.",
        south: "South Asian community lane",
        southSub: "Mehndi, tiffin, weddings, ethnic wear, and more.",
        wait: "Loading…",
        busy: "Saving…",
        login: "Sign in to continue",
      };

  const langQuery = lang !== "en" ? `?lang=${lang}` : "";

  if (checking) {
    return (
      <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center px-4">
        <p className="text-sm text-[#6B7280]">{copy.wait}</p>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main className="min-h-screen bg-[#FDF8F1] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#1C1917] font-medium">{copy.login}</p>
        <Link
          href={`/auth/login${langQuery}`}
          className="text-sm font-semibold text-[#1B4332] underline underline-offset-2"
        >
          → {lang === "es" ? "Entrar" : "Log in"}
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✦</div>
          <h1 className="font-serif text-2xl font-bold text-[#1C1917] mb-2">{copy.title}</h1>
          <p className="text-sm text-[#6B7280] leading-relaxed">{copy.sub}</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
        ) : null}

        <div className="space-y-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void pick("latino")}
            className="w-full text-left rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm hover:border-[#1B4332]/40 transition-colors disabled:opacity-60"
          >
            <div className="font-semibold text-[#1C1917]">{copy.latino}</div>
            <div className="text-xs text-[#6B7280] mt-1 leading-relaxed">{copy.latinoSub}</div>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void pick("south_asian")}
            className="w-full text-left rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm hover:border-[#1B4332]/40 transition-colors disabled:opacity-60"
          >
            <div className="font-semibold text-[#1C1917]">{copy.south}</div>
            <div className="text-xs text-[#6B7280] mt-1 leading-relaxed">{copy.southSub}</div>
          </button>
        </div>

        {saving ? <p className="text-center text-xs text-[#6B7280] mt-6">{copy.busy}</p> : null}
      </div>
    </main>
  );
}

export default function CommunityOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <CommunityOnboardingInner />
    </Suspense>
  );
}
