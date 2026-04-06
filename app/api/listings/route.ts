import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const DEMO_SELLER = "a1000000-0000-0000-0000-000000000001";

// Category price floors (MXN centavos) — anything below = auto-reject
const PRICE_FLOORS: Record<string, number> = {
  electronics:  50000,   // $500 MXN min
  vehicles:    500000,   // $5,000 MXN min
  fashion:      10000,   // $100 MXN min
  home:         10000,   // $100 MXN min
  realestate: 1000000,  // $10,000 MXN min
  sports:       10000,
  services:     10000,
  default:       5000,   // $50 MXN min for anything else
};

export async function GET() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/listings?select=*,users(display_name,trust_badge)&status=eq.active&order=created_at.desc&limit=24`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const price_mxn = body.price_mxn ?? Math.round((parseFloat(body.price) || 0) * 100);
    const category  = body.category_id ?? body.category ?? "default";

    // ── Fraud: price manipulation detection ─────────────────────────────────
    const floor = PRICE_FLOORS[category] ?? PRICE_FLOORS.default;

    if (price_mxn <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a $0." },
        { status: 400 }
      );
    }
    if (price_mxn === 100) { // exactly $1 peso (stored as centavos)
      return NextResponse.json(
        { error: "Precio inválido. El precio mínimo para esta categoría es mayor." },
        { status: 400 }
      );
    }
    if (price_mxn < floor) {
      return NextResponse.json(
        { error: `Precio muy bajo para esta categoría. Mínimo: $${Math.round(floor / 100).toLocaleString("es-MX")} MXN.` },
        { status: 400 }
      );
    }
    // Price > $5M MXN — likely a test/spam listing
    if (price_mxn > 500_000_000) {
      return NextResponse.json(
        { error: "Precio inválido. Verifica el monto." },
        { status: 400 }
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    const listing = {
      seller_id:          body.seller_id ?? DEMO_SELLER,
      title_es:           body.title_es ?? body.title ?? "Sin título",
      title_en:           body.title_es ?? body.title ?? "Untitled",
      description_es:     body.description_es ?? body.description ?? "",
      price_mxn,
      category_id:        category,
      condition:          body.condition ?? "good",
      status:             "active",
      location_city:      body.location_city ?? body.city ?? "San Miguel de Allende",
      location_state:     body.location_state ?? "Guanajuato",
      zip_code:           body.zip_code ?? "37745",
      location_lat:       body.location_lat ?? 20.91528,
      location_lng:       body.location_lng ?? -100.74389,
      shipping_available: body.shipping_available ?? body.shipping ?? false,
      negotiable:         body.negotiable ?? false,
      photo_urls:         body.photo_urls ?? [],
      expires_at:         new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const res = await fetch(`${SUPA_URL}/rest/v1/listings`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(listing),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });

    // Fire fraud score to FastAPI (non-blocking)
    const fastapiUrl = process.env.FASTAPI_INTERNAL_URL;
    if (fastapiUrl && data[0]?.id) {
      fetch(`${fastapiUrl}/fraud/score/${data[0].id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": "tianguis_secret_2026" },
        body: JSON.stringify({ price_mxn, category_id: category, seller_id: listing.seller_id }),
      }).catch(() => {});

      // Auto-embed new listing for hybrid search (non-blocking, fire-and-forget)
      fetch(`${fastapiUrl}/ml/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": "tianguis_secret_2026" },
        body: JSON.stringify({
          listing_id: data[0].id,
          text: `${listing.title_es} ${listing.description_es}`.trim(),
        }),
      }).catch(() => {});
    }

    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
