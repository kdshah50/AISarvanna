"use client";

import { useState } from "react";

const REASONS = [
  { value: "fraud", label: "Fraude / estafa" },
  { value: "fake_listing", label: "Anuncio falso" },
  { value: "misleading", label: "Información engañosa" },
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Otro" },
] as const;

export default function ReportButton({
  listingId,
  sellerId,
}: {
  listingId?: string;
  sellerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!reason) {
      setError("Selecciona un motivo");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          listingId: listingId || null,
          sellerId: sellerId || null,
          reason,
          details: details || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) {
          setError("Inicia sesión para reportar");
        } else {
          setError(data?.error ?? "Error al enviar");
        }
        return;
      }
      setDone(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-2">
        <span className="text-xs text-emerald-600 font-semibold">✓ Reporte enviado — lo revisaremos pronto</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-red-500 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1C1917]">Reportar anuncio</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#9CA3AF] hover:text-[#1C1917] text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6B7280] mb-4">
              Tu reporte es anónimo para el vendedor. Nuestro equipo lo revisará en 24 horas.
            </p>

            <div className="space-y-2 mb-4">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    reason === r.value
                      ? "border-red-400 bg-red-50"
                      : "border-[#E5E0D8] hover:border-[#9CA3AF]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-[#1C1917]">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Detalles adicionales (opcional)"
              maxLength={2000}
              rows={3}
              className="w-full rounded-xl border border-[#E5E0D8] px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-3"
            />

            {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-[#E5E0D8] text-sm font-semibold text-[#6B7280] hover:bg-[#F4F0EB] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !reason}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {submitting ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
