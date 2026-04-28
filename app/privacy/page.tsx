import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | AISaravanna",
  description: "How AISaravanna handles your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#FDF8F1]">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-16">
        <p className="text-sm text-[#6B7280] mb-2">
          <Link href="/" className="text-[#1B4332] font-semibold hover:underline">
            ← Inicio
          </Link>
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#1B4332] mb-6">Aviso de privacidad</h1>
        <div className="prose prose-stone max-w-none text-[#1C1917] text-sm space-y-4 leading-relaxed">
          <p>
            AISaravanna recopila y trata datos personales que nos proporcionas al usar el
            servicio (por ejemplo, teléfono para verificación, mensajes con otros usuarios, y datos
            de anuncios). Usamos la información para operar el marketplace, la seguridad de las
            cuentas, y el cumplimiento de obligaciones legales aplicables.
          </p>
          <p>
            Puedes solicitar acceso, rectificación o baja de tus datos de acuerdo con la
            normativa aplicable en México (por ejemplo, LFPDPPP) contactando al soporte del
            servicio. Conservamos la información el tiempo necesario para la operación y las
            obligaciones legales.
          </p>
          <p className="text-[#6B7280] text-xs">
            Este texto es informativo y no constituye asesoría legal. Ajusta el contenido con un
            abogado según tu operación.
          </p>
        </div>
      </div>
    </main>
  );
}
