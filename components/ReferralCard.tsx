"use client";

import { useState, useEffect } from "react";

type Lang = "es" | "en";

export default function ReferralCard({ lang = "en" }: { lang?: Lang }) {
  const [link, setLink] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [bonus, setBonus] = useState<number>(25);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.link) setLink(d.link);
        if (d?.code) setCode(d.code);
        if (typeof d?.bonusPoints === "number") setBonus(d.bonusPoints);
      })
      .catch(() => {});
  }, []);

  const t =
    lang === "es"
      ? {
          title: "Invita y gana",
          body: (n: number) =>
            `Comparte tu enlace. Cuando un amigo haga su primera reserva paga, recibes ${n} puntos en la plataforma.`,
          copy: "Copiar enlace",
          copied: "Copiado",
        }
      : {
          title: "Refer and earn",
          body: (n: number) =>
            `Share your link. When a friend completes their first paid booking, you get ${n} points on the platform.`,
          copy: "Copy link",
          copied: "Copied",
        };

  const copy = () => {
    if (!link) return;
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!link || !code) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 mb-5 animate-pulse h-24" aria-hidden />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5 mb-5 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-[#1C1917] mb-2">🤝 {t.title}</h2>
      <p className="text-sm text-[#6B7280] leading-relaxed mb-3">{t.body(bonus)}</p>
      <p className="text-xs font-mono text-[#1B4332] mb-2 break-all">Code: {code}</p>
      <button
        type="button"
        onClick={copy}
        className="w-full py-2.5 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors"
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}
