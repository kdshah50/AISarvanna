"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="font-serif text-xl font-bold text-[#1C1917] mb-2">Algo salió mal</h1>
        <p className="text-sm text-[#6B7280] mb-2">
          Hubo un error al cargar esta página.
        </p>
        <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2 mb-4 break-words">
          {error?.message || "Error desconocido"}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white font-semibold text-sm"
          >
            Reintentar
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="w-full py-3 rounded-xl border border-[#E5E0D8] text-[#374151] font-semibold text-sm"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </main>
  );
}
