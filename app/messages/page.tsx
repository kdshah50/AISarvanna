"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Thread = {
  conversationId: string;
  listing_id: string;
  listing_title: string;
  role: "buyer" | "seller";
  other_name: string;
  last_body: string;
  last_at: string;
};

export default function MessagesInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/conversations/inbox", { credentials: "same-origin" });
      if (res.status === 401) {
        setUnauth(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setThreads(data.threads ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (unauth) {
    return (
      <main className="min-h-screen bg-[#FDF8F1] px-4 py-12 text-center">
        <p className="text-[#374151] mb-4">Inicia sesión para ver tus mensajes.</p>
        <Link href="/auth/login" className="text-[#1B4332] font-semibold underline">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] mb-2">Mensajes</h1>
        <p className="text-sm text-[#6B7280] mb-6">Conversaciones por anuncio</p>
        {threads.length === 0 ? (
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-8 text-center text-sm text-[#6B7280]">
            Aún no tienes mensajes. Abre un anuncio y escribe al vendedor.
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.conversationId}>
                <Link
                  href={`/messages/${t.conversationId}`}
                  className="block rounded-xl border border-[#E5E0D8] bg-white p-4 hover:border-[#1B4332] transition-colors"
                >
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#1B4332] uppercase tracking-wide">
                      {t.role === "seller" ? "Comprador" : "Vendedor"} · {t.other_name}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">
                      {new Date(t.last_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#1C1917] truncate">{t.listing_title}</p>
                  <p className="text-xs text-[#6B7280] truncate mt-0.5">{t.last_body || "Sin mensajes"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
