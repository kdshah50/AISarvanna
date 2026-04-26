import Link from "next/link";
import ClearCartOnSuccess from "@/components/cart/ClearCartOnSuccess";

export default function CartSuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string };
}) {
  const sid = searchParams?.session_id;
  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <ClearCartOnSuccess />
      <div className="text-5xl mb-4">✓</div>
      <h1 className="font-serif text-2xl font-bold text-[#1B4332] mb-2">Pago recibido</h1>
      <p className="text-[#6B7280] text-sm mb-6">
        Gracias. El vendedor recibirá el pago del artículo según Stripe. Guarda tu comprobante si lo necesitas.
      </p>
      {sid && <p className="text-xs text-[#9CA3AF] mb-6 break-all">Referencia: {sid}</p>}
      <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-[#1B4332] text-white font-semibold text-sm">
        Volver al inicio
      </Link>
    </main>
  );
}
