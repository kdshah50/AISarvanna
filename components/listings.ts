"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "electronics", icon: "📱", label: "Electrónica" },
  { id: "vehicles",    icon: "🚗", label: "Vehículos" },
  { id: "fashion",     icon: "👗", label: "Moda" },
  { id: "home",        icon: "🏠", label: "Hogar" },
  { id: "services",    icon: "🔧", label: "Servicios" },
  { id: "realestate",  icon: "🏡", label: "Bienes Raíces" },
  { id: "sports",      icon: "⚽", label: "Deportes" },
];

export default function SellModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("electronics");
  const [city, setCity] = useState("CDMX");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    if (!title || !price) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_es: title,
          title_en: title,
          description_es: desc || title,
          price_mxn: Math.round(parseFloat(price) * 100),
          category_id: category,
          condition: "good",
          status: "active",
          location_city: city,
          location_state: "CDMX",
          shipping_available: false,
          negotiable: true,
          photo_urls: [],
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => { onClose(); router.refresh(); }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Inicia sesión para publicar.");
        } else {
          setError((err as { message?: string; error?: string }).message || (err as { error?: string }).error || "Error al publicar");
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-2xl w-full max-w-lg p-10 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-serif text-2xl font-bold text-[#1B4332] mb-2">¡Publicado!</h2>
          <p className="text-[#6B7280]">Tu artículo ya está visible para compradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-[#E5E0D8] rounded mx-auto mb-5" />

        <div className="flex gap-1.5 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded transition-all ${
                s <= step ? "bg-[#1B4332]" : "bg-[#E5E0D8]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="font-serif text-xl font-bold mb-1">¿Qué quieres vender?</h2>
            <p className="text-sm text-[#6B7280] mb-5">Llena los detalles de tu artículo.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] block mb-1">TÍTULO</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. iPhone 14 Pro Max 256GB"
                  className="w-full border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] block mb-1">PRECIO (MXN)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] text-sm">$</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    placeholder="0"
                    className="w-full border border-[#E5E0D8] rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] block mb-1">DESCRIPCIÓN</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe tu artículo..."
                  className="w-full border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] block mb-2">CATEGORÍA</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        category === c.id
                          ? "bg-[#1B4332] text-white"
                          : "bg-[#F4F0EB] text-[#1C1917]"
                      }`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!title || !price}
              className="w-full mt-6 bg-[#1B4332] text-white py-3 rounded-xl font-semibold disabled:opacity-40"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-serif text-xl font-bold mb-1">Alcance y publicación</h2>
            <p className="text-sm text-[#6B7280] mb-5">Elige dónde mostrar tu anuncio.</p>

            <div className="space-y-2 mb-5">
              {["CDMX", "Guadalajara", "Monterrey", "Puebla"].map((c) => (
                <div
                  key={c}
                  onClick={() => setCity(c)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                    city === c ? "border-[#1B4332] bg-[#F0FDF4]" : "border-[#E5E0D8]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      city === c ? "border-[#1B4332]" : "border-[#E5E0D8]"
                    }`}
                  >
                    {city === c && <div className="w-2.5 h-2.5 rounded-full bg-[#1B4332]" />}
                  </div>
                  <span className="font-medium text-sm">{c}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 flex gap-3 mb-5">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-[#065F46]">Compra Protegida</p>
                <p className="text-xs text-[#047857]">Gratis para vendedores. Compradores pagan 3%.</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-[#1B4332] text-[#1B4332] rounded-xl font-semibold"
              >
                ←
              </button>
              <button
                onClick={handlePublish}
                disabled={submitting}
                className="flex-1 bg-[#D4A017] text-white py-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {submitting ? "Publicando..." : "✦ Publicar gratis"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
