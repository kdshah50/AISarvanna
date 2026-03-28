"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SellModal = dynamic(() => import("./SellModal"), { ssr: false });

function LangToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = params.get("lang") || "es";
  const toggle = (l: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("lang", l);
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <div className="flex bg-[#F4F0EB] rounded-lg p-0.5 gap-0.5">
      {["es", "en"].map((l) => (
        <button key={l} onClick={() => toggle(l)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            lang === l ? "bg-white text-[#1B4332] shadow-sm" : "text-[#6B7280] hover:text-[#1B4332]"
          }`}
        >{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

function HeaderInner() {
  const [showSell, setShowSell] = useState(false);
  const params = useSearchParams();
  const lang = params.get("lang") || "es";
  return (
    <>
      <header className="bg-white border-b border-[#E5E0D8] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0">
            <span className="font-serif text-xl font-bold text-[#1B4332]">T</span>
            <span className="font-serif text-lg text-[#1C1917]">ianguis</span>
            <span className="text-[#D4A017] text-xs font-bold ml-0.5">✦</span>
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            <Suspense fallback={<div className="w-16 h-7 bg-[#F4F0EB] rounded-lg" />}>
              <LangToggle />
            </Suspense>
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
