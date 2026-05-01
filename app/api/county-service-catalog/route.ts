import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUrl } from "@/lib/service-rest";

const SELECT =
  "service_slug,label_en,label_es,blurb_en,blurb_es,strategy_tag,sort_order";

export async function GET(req: NextRequest) {
  const county = req.nextUrl.searchParams.get("county")?.trim().toLowerCase() ?? "";
  if (!county || !/^[a-z][a-z0-9_]*$/.test(county)) {
    return NextResponse.json({ error: "Query ?county=<county_key> required." }, { status: 400 });
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anon) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." }, { status: 503 });
  }

  try {
    const url = getSupabaseUrl();
    const path =
      `/rest/v1/county_service_catalog?county_key=eq.${encodeURIComponent(county)}` +
      `&active=eq.true&select=${SELECT}&order=sort_order.asc`;
    const res = await fetch(`${url}${path}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Supabase error", detail: text.slice(0, 500) },
        { status: 502 },
      );
    }
    const rows = await res.json();
    return NextResponse.json({ county_key: county, items: Array.isArray(rows) ? rows : [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
