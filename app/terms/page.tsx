import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use | AISaravanna",
  description: "General terms for using the AISaravanna platform (English & Spanish UI).",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#FDF8F1]">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-16">
        <p className="text-sm text-[#6B7280] mb-2">
          <Link href="/" className="text-[#1B4332] font-semibold hover:underline">
            ← Inicio
          </Link>
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#1B4332] mb-6">Términos de uso</h1>
        <div className="prose prose-stone max-w-none text-[#1C1917] text-sm space-y-4 leading-relaxed">
          <p>
            Al usar AISaravanna aceptas utilizar el servicio de buena fe: publicar información veraz
            en los anuncios, respetar a compradores y vendedores, y no emplear la plataforma para
            actividades ilícitas, spam o fraude. Las transacciones entre usuarios son acuerdos
            entre ustedes; la plataforma facilita el contacto y, cuando aplique, pagos a través
            de proveedores terceros (p. ej. procesadores de pago).
          </p>
          <p>
            Podemos suspender cuentas o contenido que viole estos términos o ponga en riesgo a la
            comunidad. Nos reservamos el derecho de modificar el servicio y de actualizar estas
            condiciones, publicando la versión vigente en este sitio.
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
