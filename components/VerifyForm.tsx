"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nationalDigitsForDisplay } from "@/lib/phone";

export default function VerifyForm() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(90);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
<<<<<<< HEAD
  const displayPhone = "+" + phone;
=======
  const { prefix: phonePrefix, formatted: displayNational } = useMemo(
    () => nationalDigitsForDisplay(phone),
    [phone]
  );
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setResendCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code]; next[i] = digit; setCode(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(d => d)) handleVerify(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleVerify = async (fullCode: string) => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código incorrecto");
      document.cookie = `tianguis_token=${data.token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
      router.push("/profile");
    } catch (e: any) {
      setError(e.message);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setResendCountdown(90);
    await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
  };

  return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="font-serif text-2xl font-bold text-[#1C1917] mb-2">Código enviado</h1>
          <p className="text-sm text-[#6B7280]">
            Enviamos un código de 6 dígitos por WhatsApp a<br />
            <span className="font-semibold text-[#1C1917]">
              {phonePrefix} {displayNational}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 shadow-sm">
          <div className="flex gap-2 justify-center mb-6">
            {code.map((digit, i) => (
              <input key={i} ref={el => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors"
                style={{ borderColor: digit ? "#1B4332" : "#E5E0D8", background: digit ? "#F0FDF4" : "white" }}
              />
            ))}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4 text-center">{error}</div>
          )}
          <button
            onClick={() => { const f = code.join(""); if (f.length === 6) handleVerify(f); }}
            disabled={code.join("").length < 6 || loading}
            className="w-full py-3.5 rounded-xl bg-[#1B4332] text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</> : "Verificar código"}
          </button>
          <div className="text-center mt-4">
            {resendCountdown > 0
              ? <p className="text-sm text-[#9CA3AF]">Reenviar en {resendCountdown}s</p>
              : <button onClick={handleResend} className="text-sm text-[#1B4332] font-semibold hover:underline">Reenviar código por WhatsApp</button>
            }
          </div>
        </div>
        <button onClick={() => router.push("/auth/login")} className="w-full text-center text-sm text-[#6B7280] mt-4 hover:text-[#1B4332]">
          ← Cambiar número
        </button>
      </div>
    </main>
  );
}
