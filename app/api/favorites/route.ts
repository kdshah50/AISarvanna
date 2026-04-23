import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET — list current user's favorited listing IDs (and optional ?listingId= to check one).
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const listingId = req.nextUrl.searchParams.get("listingId");
  const supabase = createAdminSupabase();

  if (listingId) {
    const { data: row } = await supabase
      .from("user_favorite_listings")
      .select("listing_id")
      .eq("user_id", userId)
      .eq("listing_id", listingId)
      .maybeSingle();
    return NextResponse.json({ favorited: !!row });
  }

  const enrich = req.nextUrl.searchParams.get("enrich") === "1";
  if (enrich) {
    const { data: rows, error } = await supabase
      .from("user_favorite_listings")
      .select("listing_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ids = (rows ?? []).map((r) => r.listing_id);
    if (ids.length === 0) return NextResponse.json({ favorites: [] });

    const { data: listings, error: lErr } = await supabase
      .from("listings")
      .select("id, title_es, price_mxn, location_city, status, is_verified")
      .in("id", ids);
    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });
    const byId = new Map((listings ?? []).map((l) => [l.id, l]));
    const items = (rows ?? [])
      .map((r) => {
        const L = byId.get(r.listing_id);
        if (!L) return null;
        return {
          listing_id: r.listing_id,
          created_at: r.created_at,
          title: L.title_es,
          price_mxn: L.price_mxn,
          location_city: L.location_city,
          status: L.status,
          is_verified: L.is_verified,
        };
      })
      .filter(Boolean);
    return NextResponse.json({ favorites: items });
  }

  const { data: rows, error } = await supabase
    .from("user_favorite_listings")
    .select("listing_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favoriteIds: (rows ?? []).map((r) => r.listing_id) });
}

/**
 * POST { listingId } — add favorite
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const listingId = String((body as { listingId?: string }).listingId ?? "").trim();
  if (!listingId) return NextResponse.json({ error: "listingId requerido" }, { status: 400 });

  const supabase = createAdminSupabase();
  const { data: exists } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();
  if (!exists) return NextResponse.json({ error: "Listado no encontrado" }, { status: 404 });

  const { error } = await supabase.from("user_favorite_listings").insert({ user_id: userId, listing_id: listingId });
  if (error) {
    if (String(error.message).toLowerCase().includes("duplicate") || error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE ?listingId=
 */
export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "listingId requerido" }, { status: 400 });

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("user_favorite_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
