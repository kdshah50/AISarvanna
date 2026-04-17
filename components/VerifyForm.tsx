"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { canonicalizeAuthPhone, nationalDigitsForDisplay, normalizeAuthPhone } from "@/lib/phone";

export default function VerifyForm() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(90);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const devOtpAutoStarted = useRef(false);
  const router = useRouter();
  const params = useSearchParams();
  const phone = canonicalizeAuthPhone(normalizeAuthPhone(params.get("phone") ?? ""));
  const devOtp = (params.get("otp") ?? "").replace(/\D/g, "").slice(0, 6);
  const returnTo = params.get("returnTo") ?? "";
  const { prefix: phonePrefix, formatted: displayNational } = useMemo(() => nationalDigitsForDisplay(phone), [phone]);

  useEffect(() => {
    if (!phone) router.replace("/auth/login");
  }, [phone, router]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setResendCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = useCallback(
    async (fullCode: string) => {
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: fullCode }),
        });
        const ct = res.headers.get("content-type") ?? "";
        const data = ct.includes("application/json") ? await res.json() : null;
        if (!res.ok) {
          throw new Error((data as { error?: string } | null)?.error ?? "Código incorrecto");
        }
        const token = (data as { token?: string } | null)?.token;
        if (!token) throw new Error("Respuesta inválida del servidor");
        document.cookie = `tianguis_token=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
        router.push(returnTo && returnTo.startsWith("/") ? returnTo : "/profile");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [phone, router]
  );

  useEffect(() => {
    // In local/dev, auto-fill OTP returned by send endpoint (once).
    if (devOtp.length !== 6 || !phone || devOtpAutoStarted.current) return;
    devOtpAutoStarted.current = true;
    const digits = devOtp.split("");
    setCode(digits);
    void handleVerify(devOtp);
  }, [devOtp, phone, handleVerify]);

  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every((d) => d)) void handleVerify(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setResendCountdown(90);
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
            Enviamos un código de 6 dígitos por WhatsApp a
            <br />
            <span className="font-semibold text-[#1C1917]">
              {phonePrefix} {displayNational}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 shadow-sm">
          <div className="flex gap-2 justify-center mb-6">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors"
                style={{ borderColor: digit ? "#1B4332" : "#E5E0D8", background: digit ? "#F0FDF4" : "white" }}
              />
            ))}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4 text-center">{error}</div>
          )}
          <button
            onClick={() => {
              const f = code.join("");
              if (f.length === 6) void handleVerify(f);
            }}
            disabled={code.join("").length < 6 || loading}
            className="w-full py-3.5 rounded-xl bg-[#1B4332] text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...
              </>
            ) : (
              "Verificar código"
            )}
          </button>
          <div className="text-center mt-4">
            {resendCountdown > 0 ? (
              <p className="text-sm text-[#9CA3AF]">Reenviar en {resendCountdown}s</p>
            ) : (
              <button onClick={handleResend} className="text-sm text-[#1B4332] font-semibold hover:underline">
                Reenviar código por WhatsApp
              </button>
            )}
          </div>
        </div>
        <button onClick={() => router.push("/auth/login")} className="w-full text-center text-sm text-[#6B7280] mt-4 hover:text-[#1B4332]">
          ← Cambiar número
        </button>
      </div>
    </main>
  );
}
