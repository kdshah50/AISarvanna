"use client";

import { useState } from "react";

export default function SellerStripePayoutCard({
  lang,
  hasStripeConnect,
}: {
  lang: "es" | "en";
  hasStripeConnect?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/connect/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasStripeConnect ? {} : { email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((data as { error?: string }).error ?? "Error");
        return;
      }
      const url = (data as { url?: string }).url;
      if (url) window.location.href = url;
    } catch {
      setMsg(lang === "en" ? "Could not start Stripe" : "No se pudo abrir Stripe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-[#1C1917] mb-2">
        {lang === "en" ? "Payouts (item cart)" : "Cobros por carrito (artículos)"}
      </h2>
      <p className="text-sm text-[#6B7280] mb-4 leading-relaxed">
        {lang === "en"
          ? "Buyers can pay for goods in the cart. Connect a Stripe Express account to receive the item subtotal. Naranjogo keeps the commission + VAT line shown at checkout."
          : "Los compradores pueden pagar artículos en el carrito. Conecta una cuenta Stripe Express para recibir el subtotal del artículo. Naranjogo retiene la comisión y el IVA mostrados al pagar."}
      </p>
      {hasStripeConnect && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
          {lang === "en" ? "Stripe account linked — you can reopen onboarding to finish verification." : "Cuenta Stripe vinculada — abre de nuevo si debes completar la verificación."}
        </p>
      )}
      {!hasStripeConnect && (
        <>
          <label className="block text-xs font-semibold text-[#6B7280] mb-1">
            {lang === "en" ? "Email for Stripe" : "Correo para Stripe"}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full border border-[#E5E0D8] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#1B4332]"
          />
        </>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="w-full py-3 rounded-xl bg-[#635BFF] text-white text-sm font-semibold disabled:opacity-50"
      >
        {busy
          ? "…"
          : hasStripeConnect
            ? lang === "en"
              ? "Open Stripe dashboard"
              : "Abrir verificación Stripe"
            : lang === "en"
              ? "Continue with Stripe"
              : "Continuar con Stripe"}
      </button>
      {msg && <p className="mt-3 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
