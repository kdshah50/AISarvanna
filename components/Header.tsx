"use client";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { langFromParam, writeStoredLang, hrefWithLang, DEFAULT_LANG } from "@/lib/i18n-lang";
import { clearGoogtransCookies } from "@/lib/google-translate-cookie";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import type { CommunityLane } from "@/lib/community-lane";
import AppLangSelect from "@/components/AppLangSelect";

const SellModal = dynamic(() => import("./SellModal"), { ssr: false });
const CartHeaderLink = dynamic(() => import("@/components/cart/CartHeaderLink"), { ssr: false });

/** Dual marketplace lane — always visible; updates localStorage + profile when logged in. */
function CommunityLaneToggle({ lang }: { lang: ReturnType<typeof langFromParam> }) {
  const router = useRouter();
  const { lane, savingChoice, saveCommunityLane } = useCommunityLane();

  const title =
    lang === "es"
      ? "Comunidad (categorías del inicio): Latino o South Asian"
      : "Market community (home categories): Latino or South Asian";

  const pick = async (choice: CommunityLane) => {
    try {
      await saveCommunityLane(choice);
    } catch {
      /* optimistic local save still applied in provider */
    }
    router.refresh();
  };

  const latinoLbl = lang === "es" ? "Latino" : "Latino";
  const saLbl = lang === "es" ? "S. Asiática" : "S. Asian";

  return (
    <div
      className="flex shrink-0 items-center rounded-lg border border-[#E5E0D8] bg-[#FDF8F1] p-0.5 gap-0.5"
      title={title}
      role="group"
      aria-label={title}
    >
      <button
        type="button"
        disabled={savingChoice}
        onClick={() => void pick("latino")}
        className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition-all sm:px-2.5 sm:text-xs ${
          lane === "latino"
            ? "bg-[#1B4332] text-white shadow-sm"
            : "text-[#6B7280] hover:bg-white/80 hover:text-[#1B4332]"
        }`}
      >
        {latinoLbl}
      </button>
      <button
        type="button"
        disabled={savingChoice}
        onClick={() => void pick("south_asian")}
        className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition-all sm:px-2.5 sm:text-xs ${
          lane === "south_asian"
            ? "bg-[#1B4332] text-white shadow-sm"
            : "text-[#6B7280] hover:bg-white/80 hover:text-[#1B4332]"
        }`}
      >
        {saLbl}
      </button>
    </div>
  );
}

function HeaderLangBlock() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { lane } = useCommunityLane();
  const labelLang = langFromParam(params.get("lang"));

  useEffect(() => {
    if (lane !== "latino") return;
    if (labelLang !== "hi" && labelLang !== "gu") return;
    clearGoogtransCookies();
    writeStoredLang(DEFAULT_LANG);
    const dest = hrefWithLang(pathname, DEFAULT_LANG, params);
    void fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ui_lang: DEFAULT_LANG }),
    }).catch(() => {});
    window.location.assign(`${typeof window !== "undefined" ? window.location.origin : ""}${dest}`);
  }, [lane, labelLang, pathname, params]);

  return <AppLangSelect labelLang={labelLang} />;
}

function HeaderLangSelect() {
  return (
    <Suspense fallback={<div className="w-36 h-7 bg-[#F4F0EB] rounded-lg shrink-0" />}>
      <HeaderLangBlock />
    </Suspense>
  );
}

function HeaderInner() {
  const [showSell, setShowSell] = useState(false);
  const [user, setUser] = useState<{ phone: string; badge: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const params = useSearchParams();
  const lang = langFromParam(params.get("lang"));
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { loggedIn?: boolean; phone?: string; badge?: string }) => {
        if (d.loggedIn && d.phone && d.badge != null) {
          setUser({ phone: d.phone, badge: d.badge });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = () => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      setUser(null);
      setShowMenu(false);
      router.push("/");
    });
  };

  const badgeIcon = (b: string) => b === "diamond" ? "💎" : b === "gold" ? "🥇" : "🥉";

  return (
    <>
      <header className="bg-white border-b border-[#E5E0D8] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href={hrefWithLang("/", lang, params)} className="flex-shrink-0 font-serif text-lg font-bold tracking-tight">
            <span className="text-[#1B4332]">AI</span>
            <span className="text-[#1C1917]">Saravanna</span>
            <span className="text-[#D4A017] text-xs font-bold ml-0.5">✦</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto min-w-0">
            <CommunityLaneToggle lang={lang} />
            <HeaderLangSelect />

            {user ? (
              /* Logged-in user avatar + menu */
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4F0EB] hover:bg-[#E5E0D8] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-[10px] font-bold">
                    {(user.phone.length >= 2 ? user.phone.slice(-2) : "••").toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-[#1B4332]">
                    {badgeIcon(user.badge)}
                  </span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#E5E0D8] rounded-xl shadow-lg overflow-hidden z-50">
                    <Link
                      href={hrefWithLang("/messages", lang)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#F4F0EB] transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      {lang === "en" ? "Messages" : "Mensajes"}
                    </Link>
                    <Link href={hrefWithLang("/profile", lang)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#F4F0EB] transition-colors"
                      onClick={() => setShowMenu(false)}>
                      👤 {lang === "en" ? "My profile" : "Mi perfil"}
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      🚪 {lang === "en" ? "Log out" : "Cerrar sesión"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in — show Login link */
              <Link href={hrefWithLang("/auth/login", lang)}
                className="text-sm font-semibold text-[#1B4332] hover:underline px-2">
                {lang === "en" ? "Log in" : "Entrar"}
              </Link>
            )}
            <Link href={hrefWithLang("/unete", lang)}
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white transition-colors hidden sm:inline-flex">
              {lang === "en" ? "List your service" : "Únete"}
            </Link>
            <CartHeaderLink />
            <button onClick={() => setShowSell(true)}
              className="bg-[#D4A017] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#C4900D] transition-colors">
              + {lang === "en" ? "Sell" : "Vender"}
            </button>
          </div>
        </div>
      </header>
      {showSell && <SellModal onClose={() => setShowSell(false)} />}
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="bg-white border-b border-[#E5E0D8] sticky top-0 z-50 h-14" />
    }>
      <HeaderInner />
    </Suspense>
  );
}
