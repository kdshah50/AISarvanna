import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";
const DEMO_SELLER = "a1000000-0000-0000-0000-000000000001";

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

    // Accept both field name formats (from SellModal and direct API calls)
    const listing = {
      seller_id:          body.seller_id ?? DEMO_SELLER,
      title_es:           body.title_es ?? body.title ?? "Sin título",
      title_en:           body.title_es ?? body.title ?? "Untitled",
      description_es:     body.description_es ?? body.description ?? "",
      price_mxn:          body.price_mxn ?? Math.round((parseFloat(body.price) || 0) * 100),
      category_id:        body.category_id ?? body.category ?? "electronics",
      condition:          body.condition ?? "good",
      status:             "active",
      location_city:      body.location_city ?? body.city ?? "CDMX",
      location_state:     body.location_state ?? "CDMX",
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
    return NextResponse.json(data[0] ?? data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
