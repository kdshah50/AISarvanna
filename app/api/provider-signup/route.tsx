import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";


const COLONIAS: Record<string, { lat: number; lng: number; label: string }> = {
  centro:        { lat: 20.9146, lng: -100.7439, label: "Centro Histórico" },
  guadalupe:     { lat: 20.9168, lng: -100.7465, label: "Colonia Guadalupe" },
  san_antonio:   { lat: 20.9120, lng: -100.7468, label: "San Antonio" },
  aurora:        { lat: 20.9188, lng: -100.7442, label: "Colonia Aurora" },
  olimpo:        { lat: 20.9158, lng: -100.7420, label: "El Olimpo" },
  ojo_agua:      { lat: 20.9200, lng: -100.7480, label: "Ojo de Agua" },
  balcones:      { lat: 20.9080, lng: -100.7510, label: "Los Balcones" },
  lindavista:    { lat: 20.9050, lng: -100.7490, label: "Linda Vista" },
  insurgentes:   { lat: 20.9130, lng: -100.7500, label: "Insurgentes" },
  atascadero:    { lat: 20.9240, lng: -100.7430, label: "Atascadero" },
  la_lejona:     { lat: 20.8980, lng: -100.7450, label: "La Lejona" },
  fracc_paloma:  { lat: 20.9100, lng: -100.7420, label: "Fracc. La Paloma" },
  pedregal:      { lat: 20.9060, lng: -100.7470, label: "Pedregal de Lindavista" },
  guadiana:      { lat: 20.9170, lng: -100.7500, label: "Guadiana" },
  colinas_san_j: { lat: 20.9220, lng: -100.7510, label: "Colinas de San Javier" },
  la_canada:     { lat: 20.9000, lng: -100.7480, label: "La Cañada" },
  otro:          { lat: 20.9153, lng: -100.7439, label: "San Miguel de Allende" },
};

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER ?? "";
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM    = process.env.TWILIO_WHATSAPP_FROM ?? "";

async function notifyAdmin(form: any) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !ADMIN_WHATSAPP || !TWILIO_FROM) return;
  try {
    const msg = [
      `🆕 *Naranjogo — Nuevo proveedor*`,
      `👤 ${form.name}`,
      `📱 ${form.whatsapp}`,
      `🔧 ${form.service_label}`,
      `💰 $${form.price} MXN`,
      `📍 ${form.colonia ? (COLONIAS[form.colonia]?.label ?? form.colonia) : form.city}, SMA`,
      ``,
      `"${(form.description ?? "").slice(0, 120)}..."`,
      ``,
      `✅ Términos aceptados: ${form.accepted_at}`,
      `💡 Pendiente: definir comisión antes de aprobar`,
      ``,
      `→ Aprueba en Supabase: is_verified = true`,
    ].join("\n");

    const body = new URLSearchParams({
      From: `whatsapp:${TWILIO_FROM}`,
      To:   `whatsapp:${ADMIN_WHATSAPP}`,
      Body: msg,
    });
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );
  } catch (e) {
    console.error("WhatsApp notify failed:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, whatsapp, service, service_label,
      description, price, city, colonia, address, lang,
      accepted_terms, accepted_pricing, accepted_at,
    } = body;

    // Validate required fields
    if (!name || !whatsapp || !service || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!accepted_terms || !accepted_pricing) {
      return NextResponse.json({ error: "Terms not accepted" }, { status: 400 });
    }

    // Parse price
    const price_mxn = Math.round(
      parseFloat((price ?? "0").toString().replace(/[^0-9.]/g, "")) * 100
    );

    const phone = (whatsapp ?? "").replace(/\s/g, "");

    // 1. Find existing user by phone or create new one
    const userRes = await fetch(
      `${SUPA_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const existingUsers = userRes.ok ? await userRes.json() : [];
    let sellerId: string;

    if (existingUsers.length > 0) {
      sellerId = existingUsers[0].id;
    } else {
      const newUserRes = await fetch(`${SUPA_URL}/rest/v1/users`, {
        method: "POST",
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          phone,
          display_name: name,
          trust_badge: "none",
        }),
      });
      if (!newUserRes.ok) {
        const err = await newUserRes.json();
        return NextResponse.json({ error: err }, { status: 500 });
      }
      const newUser = await newUserRes.json();
      sellerId = newUser[0]?.id;
      if (!sellerId) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // 2. Create listing — is_verified=false (pending admin approval)
    // Get precise coordinates from colonia
    const coloniaData = COLONIAS[colonia ?? "otro"] ?? COLONIAS["otro"];
    const coloniaLabel = coloniaData.label;
    const locationCity = `${coloniaLabel}, San Miguel de Allende`;
    const descWithAddress = address
      ? `${description}\n\nZona: ${coloniaLabel}${address ? ". Ref: " + address : ""}`
      : `${description}\n\nZona: ${coloniaLabel}`;

    const listing = {
      seller_id:          sellerId,
      title_es:           `${service_label} — ${coloniaLabel}, SMA`,
      title_en:           `${service_label} — ${coloniaLabel}, SMA`,
      description_es:     descWithAddress,
      price_mxn:          price_mxn > 0 ? price_mxn : 50000,
      category_id:        "services",
      condition:          "new",
      status:             "active",
      is_verified:        false,          // hidden until admin approves
      location_city:      locationCity,
      location_state:     "Guanajuato",
      zip_code:           "37745",
      location_lat:       coloniaData.lat,
      location_lng:       coloniaData.lng,
      shipping_available: false,
      negotiable:         true,
      photo_urls:         [],
      expires_at:         new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const listingRes = await fetch(`${SUPA_URL}/rest/v1/listings`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(listing),
    });

    if (!listingRes.ok) {
      const err = await listingRes.json();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    // 3. Notify admin via WhatsApp (non-blocking)
    notifyAdmin({
      name, whatsapp, service_label,
      price, city, description,
      accepted_at,
    }).catch(() => {});

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
