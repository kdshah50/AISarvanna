"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoyaltyCard from "@/components/LoyaltyCard";
import ReferralCard from "@/components/ReferralCard";
import RoutineHabitsCard from "@/components/RoutineHabitsCard";
import SellerStripePayoutCard from "@/components/SellerStripePayoutCard";
import AppLangSelect from "@/components/AppLangSelect";
import { useCommunityLane } from "@/components/CommunityLaneContext";
import { parseCommunityLane } from "@/lib/community-lane";
import { clampLangForLane } from "@/lib/lang-for-lane";
import type { Lang } from "@/lib/i18n-lang";
import { UsdCents } from "@/components/UsdAmount";
import { listingHref, langFromParam, hrefWithLang } from "@/lib/i18n-lang";
import { listingTitle } from "@/lib/listing-language";
import { formatEinDisplay } from "@/lib/nj-provider-ids";

type User = {
  id: string;
  phone: string | null;
  display_name: string | null;
  trust_badge: string;
  phone_verified: boolean;
  provider_entity_type?: string | null;
  drivers_license_number?: string | null;
  dl_photo_url?: string | null;
  dl_verified: boolean;
  ein?: string | null;
  ein_verified: boolean;
  ine_verified: boolean;
  rfc_verified: boolean;
  curp: string | null;
  rfc: string | null;
  ine_photo_url: string | null;
  stripe_connect_account_id?: string | null;
  created_at: string | null;
  community_lane?: string | null;
  ui_lang?: string | null;
  facebook_url?: string | null;
  instagram_handle?: string | null;
};

type Listing = {
  id: string;
  title_es: string;
  title_en?: string | null;
  title_hi?: string | null;
  title_gu?: string | null;
  price_mxn: number;
  status: string;
  is_verified: boolean;
  category_id: string;
  location_city: string;
  created_at: string;
};

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
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lane: ctxLane } = useCommunityLane();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg] = useState("");
  const [dlUploading, setDlUploading] = useState(false);
  const [dlMsg, setDlMsg] = useState("");
  const [favorites, setFavorites] = useState<
    {
      listing_id: string;
      title_es: string;
      title_en?: string | null;
      title_hi?: string | null;
      title_gu?: string | null;
      price_mxn: number;
      location_city: string | null;
    }[]
  >([]);

  const lane = user ? parseCommunityLane(user.community_lane) ?? ctxLane : ctxLane;
  const lang = clampLangForLane(langFromParam(searchParams.get("lang")), lane);
  useEffect(() => {
    if (!user) return;
    fetch("/api/favorites?enrich=1", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((d) => {
        setFavorites(Array.isArray(d.favorites) ? d.favorites : []);
      })
      .catch(() => {});
  }, [user]);

  const tEs = {
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
      phase3:         "Historial de reservas, reseñas, puntos e invitaciones: todo en un solo lugar.",
      communityBanner: "Personaliza las categorías de inicio según tu comunidad.",
      communityCta:   "Elegir comunidad",
      communityMarket: "Comunidad del mercado",
      communityChange: "Cambiar comunidad",
      socialHeading:  "Facebook e Instagram (opcional)",
      socialHint:     "Para que clientes que te encontraron en redes confirmen que eres tú. Reserva y pago siguen en AISaravanna.",
      facebookLabel:  "URL de Facebook",
      instagramLabel: "Usuario de Instagram",
      saveSocial:     "Guardar redes",
    };
  const tEn = {
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
      phase3:         "Bookings, reviews, points, and referrals—everything in one place.",
      communityBanner: "Pick a community lane to tailor the home page categories.",
      communityCta:   "Choose community lane",
      communityMarket: "Market community",
      communityChange: "Change community",
      socialHeading:  "Facebook & Instagram (optional)",
      socialHint:     "Help clients who found you on social confirm it’s you. Booking and payment stay on AISaravanna.",
      facebookLabel:  "Facebook URL",
      instagramLabel: "Instagram username",
      saveSocial:     "Save social links",
    };
  const t = lang === "es" ? tEs : tEn;

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        const userData = data.user as User | undefined;
        const listingsData = data.listings as Listing[] | undefined;
        if (!userData) {
          router.push("/auth/login");
          return;
        }
        setUser(userData);
        setDisplayName(userData.display_name ?? "");
        setFacebookUrl(userData.facebook_url ?? "");
        setInstagramHandle(userData.instagram_handle ?? "");
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setLoading(false);
      })
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      const u = data.user as User | undefined;
      if (u) setUser(u);
    }
    setEditing(false);
    setSaving(false);
  };

  const handleSaveSocial = async () => {
    if (!user) return;
    setSavingSocial(true);
    setSocialMsg("");
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facebook_url: facebookUrl.trim(),
        instagram_handle: instagramHandle.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const u = data.user as User | undefined;
      if (u) {
        setUser(u);
        setFacebookUrl(u.facebook_url ?? "");
        setInstagramHandle(u.instagram_handle ?? "");
      }
      setSocialMsg(lang === "es" ? "✓ Redes guardadas" : "✓ Social links saved");
    } else {
      setSocialMsg(
        typeof data.error === "string"
          ? data.error
          : lang === "es"
            ? "No se pudo guardar. Revisa la URL de Facebook o el usuario de Instagram."
            : "Could not save. Check the Facebook URL or Instagram username.",
      );
    }
    setSavingSocial(false);
  };

  const handleLogout = () => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      router.push("/");
    });
  };

  const handleDlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDlUploading(true);
    setDlMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-dl", { method: "POST", credentials: "same-origin", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDlMsg(lang === "es" ? "✓ Licencia recibida. El equipo la revisará." : "✓ License uploaded. Our team will review it.");
      if (user) setUser({ ...user, dl_photo_url: data.url });
    } catch (err: unknown) {
      setDlMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setDlUploading(false);
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (!user) return null;

  const badge = badgeInfo(user.trust_badge ?? "none");
  const memberYear = user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
  const fallbackPhone = user.phone ? user.phone.slice(-4) : "NA";
  const initials = (user.display_name?.trim() || fallbackPhone).slice(0, 2).toUpperCase();
  const activeListings   = listings.filter(l => l.status === "active" && l.is_verified);
  const pendingListings  = listings.filter(l => l.status === "active" && !l.is_verified);
  const archivedListings = listings.filter(l => l.status === "archived");

  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href={hrefWithLang("/", lang)} className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">
            ← {lang === "es" ? "Inicio" : "Home"}
          </Link>
          <AppLangSelect laneOverride={parseCommunityLane(user.community_lane)} labelLang={lang} />
        </div>

        {user.community_lane !== "latino" && user.community_lane !== "south_asian" ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{t.communityBanner}</span>
            <Link
              href={hrefWithLang("/onboarding/community", lang, new URLSearchParams({ returnTo: "/profile" }))}
              className="shrink-0 inline-flex justify-center rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-bold text-white"
            >
              {t.communityCta}
            </Link>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#374151] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <span>
              {t.communityMarket}:{" "}
              <strong className="text-[#1C1917]">
                {user.community_lane === "south_asian"
                  ? "South Asian"
                  : user.community_lane === "latino"
                    ? lang === "es"
                      ? "Latino / hispana"
                      : "Latino / Hispanic"
                    : "—"}
              </strong>
            </span>
            <Link
              href={hrefWithLang(
                "/onboarding/community",
                lang,
                new URLSearchParams({ returnTo: "/profile", change: "1" }),
              )}
              className="shrink-0 inline-flex justify-center rounded-lg border border-[#1B4332] bg-white px-4 py-2 text-xs font-bold text-[#1B4332] hover:bg-[#F4F0EB]"
            >
              {t.communityChange}
            </Link>
          </div>
        )}

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
                    {user.display_name ?? user.phone ?? "Usuario"}
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
                {(user.dl_verified || user.ine_verified) && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">
                    🪪 {lang === "es" ? "Licencia / ID" : "DL / ID"} {t.verified}
                  </span>
                )}
                {(user.ein_verified || user.rfc_verified) && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200/80">
                    🏢 EIN {t.verified}
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

        {/* Optional social discovery links */}
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] mb-1">{t.socialHeading}</h2>
          <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">{t.socialHint}</p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[#374151]">{t.facebookLabel}</span>
              <input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/yourpage"
                className="mt-1 w-full border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B4332]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#374151]">{t.instagramLabel}</span>
              <input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@yourhandle"
                className="mt-1 w-full border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B4332]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSaveSocial()}
              disabled={savingSocial}
              className="px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
            >
              {savingSocial ? "..." : t.saveSocial}
            </button>
            {socialMsg && (
              <p
                className={`text-xs rounded-xl px-3 py-2 ${
                  socialMsg.startsWith("✓") ? "bg-[#ECFDF5] text-[#065F46]" : "bg-red-50 text-red-600"
                }`}
              >
                {socialMsg}
              </p>
            )}
          </div>
        </div>

        {/* Driver license / identity (NJ) */}
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] mb-3">
            🪪 {lang === "es" ? "Verificación de proveedor (NJ)" : "Provider verification (NJ)"}
          </h2>

          {(user.ein_verified || user.rfc_verified) && (
            <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-4 text-sm text-indigo-900 font-medium flex items-center gap-2 mb-3">
              ✓{" "}
              {lang === "es"
                ? "Tu EIN de negocio fue revisado por AISaravanna"
                : "Your business EIN has been reviewed by AISaravanna"}
            </div>
          )}

          {(user.dl_verified || user.ine_verified) ? (
            <div className="bg-[#ECFDF5] rounded-xl p-4 text-sm text-[#065F46] font-medium flex items-center gap-2">
              ✓ {lang === "es" ? "Tu identidad (licencia) está verificada" : "Your license / ID is verified"}
            </div>
          ) : user.dl_photo_url || user.ine_photo_url ? (
            <div className="bg-[#FEF3C7] rounded-xl p-4 text-sm text-[#92400E] font-medium flex items-center gap-2">
              ⏳{" "}
              {lang === "es"
                ? "Tu licencia está en revisión. Te avisaremos por WhatsApp."
                : "Your license is under review. We will notify you via WhatsApp."}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#6B7280] leading-relaxed">
                {lang === "es"
                  ? "Sube una foto clara de tu licencia de conducir (EE. UU.). No se muestra públicamente; solo el equipo la usa para verificación."
                  : "Upload a clear photo of your US driver license. It is not shown publicly; our team uses it for verification only."}
              </p>
              <label className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                dlUploading ? "bg-[#E5E0D8] text-[#6B7280]" : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"
              }`}>
                {dlUploading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {lang === "es" ? "Subiendo..." : "Uploading..."}</>
                  : <>📸 {lang === "es" ? "Subir foto de licencia" : "Upload license photo"}</>
                }
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleDlUpload} className="hidden" disabled={dlUploading} />
              </label>
              <p className="text-[11px] text-[#9CA3AF]">
                {lang === "es" ? "JPEG, PNG o WebP · Máximo 5 MB" : "JPEG, PNG, or WebP · Max 5 MB"}
              </p>
            </div>
          )}

          {(user.drivers_license_number || user.ein) && (
            <div className="mt-3 bg-[#F4F0EB] rounded-xl px-4 py-2 text-xs space-y-1">
              {user.drivers_license_number && (
                <div>
                  <span className="text-[#6B7280] font-medium">{lang === "es" ? "Licencia #" : "License #"}: </span>
                  <span className="font-mono text-[#1C1917] tracking-wide">{user.drivers_license_number}</span>
                </div>
              )}
              {user.ein && (
                <div>
                  <span className="text-[#6B7280] font-medium">EIN: </span>
                  <span className="font-mono text-[#1C1917] tracking-wide">{formatEinDisplay(user.ein)}</span>
                </div>
              )}
              {user.provider_entity_type && (
                <div className="text-[#6B7280]">
                  {lang === "es" ? "Tipo" : "Type"}: {user.provider_entity_type}
                </div>
              )}
            </div>
          )}

          {dlMsg && (
            <p className={`mt-3 text-xs rounded-xl px-4 py-2 ${
              dlMsg.startsWith("✓") ? "bg-[#ECFDF5] text-[#065F46]" : "bg-red-50 text-red-600"
            }`}>
              {dlMsg}
            </p>
          )}
        </div>

        <SellerStripePayoutCard
          lang={lang}
          hasStripeConnect={Boolean(user.stripe_connect_account_id?.startsWith("acct_"))}
        />

        {/* My services */}
        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-[#1C1917]">{t.myServices}</h2>
            <Link href={hrefWithLang("/unete", lang)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors">
              + {t.addService}
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-[#6B7280] mb-4">{t.noServices}</p>
              <Link href={hrefWithLang("/unete", lang)}
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#D4A017] text-white hover:bg-[#C4900D] transition-colors">
                {t.addService} →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F0EB]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1917] truncate">{listingTitle(l, lang)}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5"><UsdCents cents={l.price_mxn} lang={lang} /> · {l.location_city}</p>
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

        {/* Loyalty + referral */}
        <div className="mb-5">
          <LoyaltyCard lang={lang} />
        </div>
        <ReferralCard lang={lang} />

        <RoutineHabitsCard lang={lang} />

        <div className="bg-white rounded-3xl border border-[#E5E0D8] p-6 mb-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] mb-3">
            {lang === "es" ? "Favoritos" : "Saved services"}
          </h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {lang === "es"
                ? "Marca un servicio con el corazón en la ficha del listado."
                : "Save a service with the heart button on a listing page."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favorites.map((f) => (
                <li key={f.listing_id}>
                  <Link
                    href={listingHref(f.listing_id, lang)}
                    className="block p-3 rounded-xl bg-[#F4F0EB] hover:bg-[#EDE8E0] transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#1C1917] truncate">{listingTitle(f, lang)}</p>
                    <p className="text-xs text-[#6B7280]">
                      <UsdCents cents={f.price_mxn} lang={lang} />
                      {f.location_city ? ` · ${f.location_city}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Bookings link */}
        <Link href={hrefWithLang("/my-bookings", lang)} className="block mb-3">
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 hover:border-[#1B4332] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-sm font-bold text-[#1C1917]">
                    {lang === "es" ? "Mis reservas" : "My bookings"}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {lang === "es" ? "Historial y volver a reservar" : "History and rebook"}
                  </p>
                </div>
              </div>
              <span className="text-[#6B7280] text-sm">→</span>
            </div>
          </div>
        </Link>

        <Link href={hrefWithLang("/seller-bookings", lang)} className="block mb-3">
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 hover:border-[#1B4332] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                <div>
                  <p className="text-sm font-bold text-[#1C1917]">
                    {lang === "es" ? "Gestionar reservas" : "Manage bookings"}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {lang === "es"
                      ? "Agendar, en curso y completar servicios pagados"
                      : "Schedule, in progress, and complete paid jobs"}
                  </p>
                </div>
              </div>
              <span className="text-[#6B7280] text-sm">→</span>
            </div>
          </div>
        </Link>

        {/* Guarantee link */}
        <div className="bg-gradient-to-r from-emerald-50 to-[#ECFDF5] rounded-2xl border border-emerald-200 p-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  {lang === "es" ? "Garantía AISaravanna" : "AISaravanna guarantee"}
                </p>
                <p className="text-xs text-emerald-700">
                  {lang === "es"
                    ? "¿Problemas con un servicio? Solicita un reembolso."
                    : "Issues with a service? Request a refund."}
                </p>
              </div>
            </div>
            <Link href={hrefWithLang("/claims", lang)} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              {lang === "es" ? "Ver" : "View"} →
            </Link>
          </div>
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
