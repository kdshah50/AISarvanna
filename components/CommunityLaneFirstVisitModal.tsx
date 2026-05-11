"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import { langFromParam } from "@/lib/i18n-lang";
import type { CommunityLane } from "@/lib/community-lane";

/** Full-screen gate on first home open when no lane is stored or on profile. */
export default function CommunityLaneFirstVisitModal() {
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = langFromParam(params.get("lang"));
  const { lane, ready, bootstrapped, saveCommunityLane, savingChoice } = useCommunityLane();

  const onHome = pathname === "/";
  const open = ready && bootstrapped && lane == null && onHome;

  const copy =
    lang === "es"
      ? {
          title: "Personaliza tu mercado",
          sub: "Elige tu comunidad para ordenar categorías. Se guarda en este dispositivo y en tu cuenta si inicias sesión.",
          latino: "Comunidad latina / hispana",
          latinoSub: "Servicios y bienes en NJ y más allá.",
          south: "Comunidad South Asian",
          southSub: "Mehndi, tiffin, bodas y más.",
          busy: "Guardando…",
        }
      : {
          title: "Personalize your marketplace",
          sub: "Pick a community lane to shape the home categories. Saved on this device and on your account when you log in.",
          latino: "Latino / Hispanic community lane",
          latinoSub: "Services and goods across our NJ neighborhoods and beyond.",
          south: "South Asian community lane",
          southSub: "Mehndi, tiffin, weddings, and more.",
          busy: "Saving…",
        };

  const pick = async (choice: CommunityLane) => {
    try {
      await saveCommunityLane(choice);
    } catch {
      /* saveCommunityLane sets lane + localStorage even if PATCH fails */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-lane-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5E0D8] bg-[#FDF8F1] shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2" aria-hidden>
            ✦
          </div>
          <h1 id="community-lane-gate-title" className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917]">
            {copy.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">{copy.sub}</p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={savingChoice}
            onClick={() => void pick("latino")}
            className="w-full text-left rounded-xl border border-[#E5E0D8] bg-white px-4 py-4 shadow-sm hover:border-[#1B4332]/35 transition-colors disabled:opacity-60"
          >
            <div className="font-semibold text-[#1C1917]">{copy.latino}</div>
            <div className="text-[11px] text-[#6B7280] mt-1">{copy.latinoSub}</div>
          </button>
          <button
            type="button"
            disabled={savingChoice}
            onClick={() => void pick("south_asian")}
            className="w-full text-left rounded-xl border border-[#E5E0D8] bg-white px-4 py-4 shadow-sm hover:border-[#1B4332]/35 transition-colors disabled:opacity-60"
          >
            <div className="font-semibold text-[#1C1917]">{copy.south}</div>
            <div className="text-[11px] text-[#6B7280] mt-1">{copy.southSub}</div>
          </button>
        </div>

        {savingChoice ? <p className="text-center text-xs text-[#6B7280] mt-5">{copy.busy}</p> : null}
      </div>
    </div>
  );
}
