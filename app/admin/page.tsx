"use client";
import { useState, useEffect } from "react";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Listing = {
  id: string;
  title_es: string;
  description_es: string;
  price_mxn: number;
  category_id: string;
  is_verified: boolean;
  status: string;
  location_city: string;
  commission_pct: number | null;
  created_at: string;
  users: { display_name: string; phone: string } | null;
};

type UserRow = {
  id: string;
  phone: string | null;
  display_name: string | null;
  trust_badge: string | null;
  phone_verified: boolean;
  ine_verified: boolean;
  created_at: string;
};

function fmtMXN(c: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(c / 100);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pinErrorDetail, setPinErrorDetail] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [tab, setTab] = useState<"listings" | "sellers">("listings");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");
  const [saving, setSaving] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [msgError, setMsgError] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState<string | null>(null);

  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const load = async () => {
    setLoading(true);
    const query = filter === "pending"
      ? "is_verified=eq.false&status=eq.active"
      : filter === "verified"
      ? "is_verified=eq.true&status=eq.active"
      : "status=eq.active";
    const res = await fetch(
      `${SUPA_URL}/rest/v1/listings?${query}&category_id=eq.services&select=id,title_es,description_es,price_mxn,category_id,is_verified,status,location_city,commission_pct,created_at,users!fk_listings_seller(display_name,phone)&order=created_at.desc&limit=50`,
      { headers }
    );
    const data = await res.json();
    setListings(Array.isArray(data) ? data : []);
    // Init commission inputs
    const c: Record<string, string> = {};
    (Array.isArray(data) ? data : []).forEach((l: Listing) => {
      c[l.id] = String(l.commission_pct ?? 5);
    });
    setCommissions(c);
    setLoading(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?pin=${encodeURIComponent(pin.trim())}`);
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setUsers([]);
    }
    setUsersLoading(false);
  };

  const updateUser = async (userId: string, updates: Record<string, unknown>) => {
    setUserSaving(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim(), userId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      showMsg(`✅ User updated`);
      await loadUsers();
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Error", true);
    } finally {
      setUserSaving(null);
    }
  };

  useEffect(() => {
    if (authed && tab === "listings") load();
    if (authed && tab === "sellers") loadUsers();
  }, [authed, filter, tab]);

  const submitPin = async () => {
    setPinError(false);
    setPinErrorDetail(null);
    setPinLoading(true);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setAuthed(true);
        return;
      }
      setPinError(true);
      if (res.status === 404) {
        setPinErrorDetail("No está el servicio de verificación. Haz redeploy en Vercel con el código nuevo.");
      } else if (res.status === 401) {
        setPinErrorDetail(data.error ?? "PIN incorrecto (revisa ADMIN_PIN / NEXT_PUBLIC_ADMIN_PIN en Vercel).");
      } else {
        setPinErrorDetail(data.error ?? `Error ${res.status}. Revisa logs en Vercel.`);
      }
    } catch {
      setPinError(true);
      setPinErrorDetail("Sin conexión o error de red.");
    } finally {
      setPinLoading(false);
    }
  };

  const showMsg = (text: string, error = false) => {
    setMsg(text);
    setMsgError(error);
    setTimeout(() => {
      setMsg("");
      setMsgError(false);
    }, 5000);
  };

  const postAdmin = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, pin: pin.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : "Error al guardar");
    }
  };

  const approve = async (id: string) => {
    setSaving(id);
    const pct = parseFloat(commissions[id] ?? "5");
    try {
      await postAdmin({ id, action: "approve", commission_pct: pct });
      showMsg(`✅ Aprobado — comisión ${pct}%`);
      await load();
    } catch (e: any) {
      showMsg(e?.message ?? "No se pudo aprobar", true);
    } finally {
      setSaving(null);
    }
  };

  const reject = async (id: string) => {
    setSaving(id);
    try {
      await postAdmin({ id, action: "reject" });
      showMsg("🗑️ Anuncio archivado");
      await load();
    } catch (e: any) {
      showMsg(e?.message ?? "No se pudo rechazar", true);
    } finally {
      setSaving(null);
    }
  };

  const updateCommission = async (id: string) => {
    setSaving(id);
    const pct = parseFloat(commissions[id] ?? "5");
    try {
      await postAdmin({ id, action: "commission", commission_pct: pct });
      showMsg(`✅ Comisión actualizada a ${pct}%`);
      await load();
    } catch (e: any) {
      showMsg(e?.message ?? "No se pudo actualizar la comisión", true);
    } finally {
      setSaving(null);
    }
  };

  // ── PIN screen ───────────────────────────────────────────────────────────
  if (!authed) return (
    <main className="min-h-screen bg-[#FDF8F1] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-[#E5E0D8] p-10 max-w-sm w-full text-center shadow-sm">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="font-serif text-xl font-bold text-[#1B4332] mb-6">Admin — Naranjogo</h1>
        <div className="relative mb-3">
          <input
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); setPinErrorDetail(null); }}
            onKeyDown={e => {
              if (e.key === "Enter" && !pinLoading) void submitPin();
            }}
            placeholder="Admin PIN"
            autoComplete="current-password"
            className="w-full border border-[#E5E0D8] rounded-xl pl-4 pr-[5.5rem] py-3 text-sm outline-none focus:border-[#1B4332] text-left"
          />
          <button
            type="button"
            onClick={() => setShowPin((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#1B4332] hover:underline px-2 py-1 rounded-lg">
            {showPin ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {pinError && (
          <p className="text-xs text-red-600 mb-3 text-left leading-relaxed">
            {pinErrorDetail ?? "PIN incorrecto"}
          </p>
        )}
        <button
          type="button"
          disabled={pinLoading || !pin.trim()}
          onClick={() => void submitPin()}
          className="w-full bg-[#1B4332] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {pinLoading ? "…" : "Enter"}
        </button>
      </div>
    </main>
  );

  // ── Admin dashboard ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1B4332]">Naranjogo Admin</h1>
            <p className="text-sm text-[#6B7280]">Provider approval, verification & trust management</p>
          </div>
          <a href="/" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← Back to site</a>
        </div>

        {/* Main tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#E5E0D8] pb-3">
          <button onClick={() => setTab("listings")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === "listings" ? "bg-[#1B4332] text-white" : "bg-white border border-[#E5E0D8] text-[#6B7280] hover:border-[#1B4332]"
            }`}>
            📋 Listings
          </button>
          <button onClick={() => setTab("sellers")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === "sellers" ? "bg-[#1B4332] text-white" : "bg-white border border-[#E5E0D8] text-[#6B7280] hover:border-[#1B4332]"
            }`}>
            👤 Sellers & Trust
          </button>
        </div>

        {/* Status message */}
        {msg && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium mb-4 border ${
              msgError
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
            }`}>
            {msg}
          </div>
        )}

        {/* ── SELLERS TAB ─────────────────────────────────────────── */}
        {tab === "sellers" && (
          <>
            {usersLoading ? (
              <div className="text-center py-20 text-[#6B7280]">Loading sellers...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E0D8]">
                <p className="text-[#6B7280] text-sm">No users found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {users.filter(u => !u.id.startsWith("a1000000")).map(u => {
                  const badge = u.trust_badge ?? "none";
                  const badgeColors: Record<string, { bg: string; text: string }> = {
                    diamond: { bg: "bg-blue-50", text: "text-blue-700" },
                    gold: { bg: "bg-yellow-50", text: "text-yellow-700" },
                    bronze: { bg: "bg-orange-50", text: "text-orange-700" },
                    none: { bg: "bg-gray-50", text: "text-gray-500" },
                  };
                  const bc = badgeColors[badge] ?? badgeColors.none;
                  return (
                    <div key={u.id} className="bg-white rounded-2xl border border-[#E5E0D8] p-5 shadow-sm">
                      <div className="flex flex-wrap gap-4 items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            {u.display_name?.[0] ?? "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1C1917]">{u.display_name || "Sin nombre"}</p>
                            <p className="text-xs text-[#6B7280]">{u.phone ?? "No phone"}</p>
                            <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                              Joined {new Date(u.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>

                        {/* Current status badges */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bc.bg} ${bc.text} capitalize`}>
                            {badge}
                          </span>
                          {u.phone_verified && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                              ✓ Phone
                            </span>
                          )}
                          {u.ine_verified && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                              ✓ INE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin actions */}
                      <div className="flex flex-wrap gap-2 items-center border-t border-[#E5E0D8] pt-3">
                        <span className="text-xs font-semibold text-[#6B7280] mr-1">Trust badge:</span>
                        {(["none", "bronze", "gold", "diamond"] as const).map(b => (
                          <button key={b} onClick={() => updateUser(u.id, { trust_badge: b })}
                            disabled={userSaving === u.id || badge === b}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 capitalize ${
                              badge === b
                                ? "bg-[#1B4332] text-white"
                                : "bg-white border border-[#E5E0D8] text-[#374151] hover:border-[#1B4332]"
                            }`}>
                            {userSaving === u.id ? "…" : b}
                          </button>
                        ))}

                        <div className="w-px h-6 bg-[#E5E0D8] mx-2 hidden sm:block" />

                        <button
                          onClick={() => updateUser(u.id, { ine_verified: !u.ine_verified })}
                          disabled={userSaving === u.id}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 ${
                            u.ine_verified
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-white border border-[#E5E0D8] text-[#6B7280] hover:border-blue-400"
                          }`}>
                          {userSaving === u.id ? "…" : u.ine_verified ? "✓ INE Verified" : "Verify INE"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── LISTINGS TAB ────────────────────────────────────────── */}
        {tab === "listings" && <>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["pending", "verified", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                filter === f
                  ? "bg-[#1B4332] text-white"
                  : "bg-white border border-[#E5E0D8] text-[#6B7280] hover:border-[#1B4332]"
              }`}>
              {f === "pending" ? "⏳ Pending approval" : f === "verified" ? "✅ Verified" : "📋 All"}
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="text-center py-20 text-[#6B7280]">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E0D8]">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-[#6B7280] text-sm">
              {filter === "pending" ? "No pending providers — all caught up!" : "No listings found"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map(l => (
              <div key={l.id} className={`bg-white rounded-2xl border p-6 shadow-sm ${
                l.is_verified ? "border-[#A7F3D0]" : "border-[#FDE68A]"
              }`}>
                <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        l.is_verified
                          ? "bg-[#ECFDF5] text-[#065F46]"
                          : "bg-[#FFFBEB] text-[#92400E]"
                      }`}>
                        {l.is_verified ? "✅ Verified" : "⏳ Pending"}
                      </span>
                      <span className="text-xs text-[#6B7280]">{fmtDate(l.created_at)}</span>
                    </div>
                    <h2 className="font-semibold text-[#1C1917] text-base">{l.title_es}</h2>
                    <p className="text-sm text-[#6B7280] mt-0.5">
                      📍 {l.location_city} · 💰 {fmtMXN(l.price_mxn)}
                    </p>
                  </div>

                  {/* Provider info */}
                  <div className="bg-[#F4F0EB] rounded-xl px-4 py-3 text-sm">
                    <p className="font-semibold text-[#1B4332]">{l.users?.display_name ?? "Unknown"}</p>
                    <p className="text-[#6B7280] text-xs">{l.users?.phone ?? "No phone"}</p>
                    {l.users?.phone && (
                      <a
                        href={`https://wa.me/${(l.users.phone).replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(l.users.display_name ?? "")}%2C%20somos%20Naranjogo%20%E2%80%94%20revisamos%20tu%20solicitud.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#25D366] font-semibold mt-1 hover:underline">
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[#374151] bg-[#F4F0EB] rounded-xl px-4 py-3 mb-4 leading-relaxed">
                  {l.description_es?.slice(0, 200)}{l.description_es?.length > 200 ? "..." : ""}
                </p>

                {/* Commission + Actions */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-[#6B7280]">Commission %</label>
                    <input
                      type="number"
                      min="0" max="30" step="0.5"
                      value={commissions[l.id] ?? "5"}
                      onChange={e => setCommissions(c => ({ ...c, [l.id]: e.target.value }))}
                      className="w-16 border border-[#E5E0D8] rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-[#1B4332]"
                    />
                    <span className="text-xs text-[#6B7280]">%</span>
                    {l.is_verified && (
                      <button onClick={() => updateCommission(l.id)}
                        disabled={saving === l.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] font-semibold hover:bg-[#DBEAFE] transition-colors disabled:opacity-40">
                        {saving === l.id ? "..." : "Update %"}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 ml-auto">
                    {!l.is_verified && (
                      <button onClick={() => approve(l.id)}
                        disabled={saving === l.id}
                        className="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors disabled:opacity-40">
                        {saving === l.id ? "..." : "✓ Approve"}
                      </button>
                    )}
                    <button onClick={() => reject(l.id)}
                      disabled={saving === l.id}
                      className="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40">
                      {saving === l.id ? "..." : l.is_verified ? "Remove" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>}
      </div>
    </main>
  );
}
