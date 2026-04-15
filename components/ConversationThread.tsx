"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

/** Load one thread by id (used on /messages/[conversationId]). */
export default function ConversationThread({
  conversationId,
  myUserId,
}: {
  conversationId: string;
  myUserId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/conversations/${conversationId}`, { credentials: "same-origin" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "No se pudo cargar");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMessages(data.messages ?? []);
    setTitle(data.listing?.title_es ?? "Conversación");
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "No se pudo enviar");
      }
      const { message } = await res.json();
      setDraft("");
      setMessages((m) => [...m, message as Msg]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#6B7280] py-8 text-center">Cargando…</div>;
  }

  return (
    <div className="rounded-xl border border-[#E5E0D8] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E0D8] bg-[#F4F0EB]">
        <h1 className="text-sm font-bold text-[#1C1917] truncate">{title}</h1>
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3 space-y-2 min-h-[120px]">
        {messages.map((m) => {
          const mine = myUserId && m.sender_id === myUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  mine ? "bg-[#1B4332] text-white" : "bg-[#F4F0EB] text-[#1C1917]"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <div className="px-4 text-xs text-red-600">{error}</div>}
      <div className="p-3 border-t border-[#E5E0D8] flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send())}
          placeholder="Escribe un mensaje…"
          disabled={sending}
          className="flex-1 rounded-xl border border-[#E5E0D8] px-3 py-2 text-sm outline-none focus:border-[#1B4332]"
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={() => void send()}
          className="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold disabled:opacity-40"
        >
          {sending ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
