import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#E5E0D8] bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6B7280]">
        <span className="text-xs">© {new Date().getFullYear()} Tianguis</span>
        <Link href="/privacy" className="hover:text-[#1B4332] font-medium">
          Privacidad
        </Link>
        <Link href="/terms" className="hover:text-[#1B4332] font-medium">
          Términos
        </Link>
      </div>
    </footer>
  );
}
