"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeJwtPayload, getTianguisTokenFromCookie } from "@/lib/client-auth";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

type User = {
  id: string;
  phone: string;
  display_name: string | null;
  trust_badge: string;
  phone_verified: boolean;
  ine_verified: boolean;
  created_at: string;
};

type Listing = {
  id: string;
  title_es: string;
  price_mxn: number;
  status: string;
  is_verified: boolean;
  category_id: string;
  location_city: string;
  created_at: string;
};

function fmtMXN(c: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(c / 100);
}

function badgeInfo(badge: string) {
  const map: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    diamond: { icon: "💎", label: "Diamond", color: "#1D4ED8", bg: "#EFF6FF" },
    gold:    { icon: "🥇", label: "Gold",    color: "#92400E", bg: "#FEF3C7" },
    bronze:  { icon: "🥉", label: "Bronze",  color: "#78350F", bg: "#FEF9EE" },
    none:    { icon: "✓",  label: "Verificado", color: "#065F46", bg: "#ECFDF5" },
  };
  return map[badge] ?? map.none;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");

  const t = {
    es: {
      myProfile:      "Mi perfil",
      memberSince:    "Miembro desde",
      phone:          "Teléfono",
      verified:       "Verificado",
      editName:       "Editar nombre",
      saveName:       "Guardar",
      cancel:         "Cancelar",
      myServices:     "Mis servicios",
      noServices:     "No tienes servicios publicados aún.",
      addService:     "Publicar un servicio",
      pending:        "Pendiente aprobación",
      live:           "En línea",
      archived:       "Archivado",
      logout:         "Cerrar sesión",
      namePlaceholder:"Tu nombre completo",
      verifyBadge:    "Insignia de confianza",
      contactSupport: "¿Preguntas? Escríbenos",
      phase3:         "Próximamente: historial de pagos, reseñas y más.",
    },
    en: {
      myProfile:      "My profile",
      memberSince:    "Member since",
      phone:          "Phone",
      verified:       "Verified",
      editName:       "Edit name",
      saveName:       "Save",
      cancel:         "Cancel",
      myServices:     "My services",
      noServices:     "You haven't posted any services yet.",
      addService:     "Post a service",
      pending:        "Pending approval",
      live:           "Live",
      archived:       "Archived",
      logout:         "Log out",
      namePlaceholder:"Your full name",
      verifyBadge:    "Trust badge",
      contactSupport: "Questions? Contact us",
      phase3:         "Coming soon: payment history, reviews, and more.",
    },
  }[lang];

  useEffect(() => {
    const token = getTianguisTokenFromCookie();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.sub || typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      router.push("/auth/login");
      return;
    }
    const userId = payload.sub;

    Promise.all([
      fetch(`${SUPA_URL}/rest/v1/users?id=eq.${userId}&select=id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }),
      fetch(`${SUPA_URL}/rest/v1/listings?seller_id=eq.${userId}&select=id,title_es,price_mxn,status,is_verified,category_id,location_city,created_at&order=created_at.desc`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }),
    ]).then(async ([uRes, lRes]) => {
      const users = uRes.ok ? await uRes.json() : [];
      const userData = Array.isArray(users) && users[0] ? users[0] : null;
      const listingsData = lRes.ok ? await lRes.json() : [];
      if (!userData) {
        router.push("/auth/login");
        return;
      }
      setUser(userData);
      setDisplayName(userData.display_name ?? "");
      setListings(Array.isArray(listingsData) ? listingsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ display_name: displayName.trim() }),
    });
    setUser(u => u ? { ...u, display_name: displayName.trim() } : u);
    setEditing(false);
    setSaving(false);
  };

  const handleLogout = () => {
    document.cookie = "tianguis_token=; path=/; max-age=0";
    router.push("/");
  };

  if (loading) return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (!user) return null;

  const badge = badgeInfo(user.trust_badge ?? "none");
  const memberYear = new Date(user.created_at).getFullYear();
  const initials = (user.display_name ?? user.phone.slice(-4)).slice(0, 2).toUpperCase();
  const activeListings   = listings.filter(l => l.status === "active" && l.is_verified);
  const pendingListings  = listings.filter(l => l.status === "active" && !l.is_verified);
  const archivedListings = listings.filter(l => l.status === "archived");

  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">← {lang === "es" ? "Inicio" : "Home"}</Link>
          <div className="flex bg-[#F4F0EB] rounded-lg p-1 gap-1">
            {(["es", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${lang === l ? "bg-white text-[#1B4332] shadow-sm" : "text-[#6B7280]"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-8 mb-5 shadow-sm">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name */}
              {editing ? (
                <div className="flex gap-2 mb-2">
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="flex-1 border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B4332]" />
                  <button onClick={handleSaveName} disabled={saving}
                    className="px-3 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-xl disabled:opacity-50">
                    {saving ? "..." : t.saveName}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-2 border border-[#E5E0D8] text-[#6B7280] text-xs rounded-xl">
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-serif text-xl font-bold text-[#1C1917]">
                    {user.display_name ?? user.phone}
                  </h1>
                  <button onClick={() => setEditing(true)}
                    className="text-xs text-[#6B7280] hover:text-[#1B4332] transition-colors">
                    ✏️
                  </button>
                </div>
              )}

              <p className="text-xs text-[#6B7280] mb-3">{t.memberSince} {memberYear}</p>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: badge.color, background: badge.bg }}>
                  {badge.icon} {badge.label}
                </span>
                {user.phone_verified && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46]">
                    📱 {t.phone} {t.verified}
                  </span>
                )}
                {user.ine_verified && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">
                    🪪 INE {t.verified}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { value: activeListings.length,  label: lang === "es" ? "En línea" : "Live" },
            { value: pendingListings.length,  label: lang === "es" ? "Pendientes" : "Pending" },
            { value: archivedListings.length, label: lang === "es" ? "Archivados" : "Archived" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E5E0D8] p-4 text-center">
              <div className="text-2xl font-bold text-[#1B4332]">{s.value}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My services */}
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-[#1C1917]">{t.myServices}</h2>
            <Link href="/unete"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors">
              + {t.addService}
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-[#6B7280] mb-4">{t.noServices}</p>
              <Link href="/unete"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#D4A017] text-white hover:bg-[#C4900D] transition-colors">
                {t.addService} →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F0EB]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1917] truncate">{l.title_es}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{fmtMXN(l.price_mxn)} · {l.location_city}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                    l.is_verified && l.status === "active"
                      ? "bg-[#ECFDF5] text-[#065F46]"
                      : l.status === "archived"
                      ? "bg-[#F4F0EB] text-[#9CA3AF]"
                      : "bg-[#FFFBEB] text-[#92400E]"
                  }`}>
                    {l.is_verified && l.status === "active" ? `✓ ${t.live}` : l.status === "archived" ? t.archived : `⏳ ${t.pending}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coming soon banner */}
        <div className="bg-[#F4F0EB] rounded-2xl p-4 mb-5 text-center">
          <p className="text-xs text-[#6B7280]">🚀 {t.phase3}</p>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors">
          🚪 {t.logout}
        </button>

      </div>
    </main>
  );
}
