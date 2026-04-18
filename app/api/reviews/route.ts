import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** GET ?sellerId=xxx — public reviews for a seller */
export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get("sellerId");
  if (!sellerId) {
    return NextResponse.json({ error: "sellerId required" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const { data: reviews, error } = await supabase
    .from("seller_reviews")
    .select("id,rating,comment,created_at,buyer_id,listing_id")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[reviews] GET error:", error);
    return NextResponse.json({ error: "Error loading reviews" }, { status: 500 });
  }

  const buyerIds = [...new Set((reviews ?? []).map((r) => r.buyer_id))];
  let buyerMap: Record<string, string> = {};
  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase
      .from("users")
      .select("id,display_name")
      .in("id", buyerIds);
    for (const b of buyers ?? []) {
      buyerMap[b.id] = b.display_name || "Comprador";
    }
  }

  const listingIds = [...new Set((reviews ?? []).map((r) => r.listing_id))];
  let listingMap: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id,title_es")
      .in("id", listingIds);
    for (const l of listings ?? []) {
      listingMap[l.id] = l.title_es || "Servicio";
    }
  }

  const enriched = (reviews ?? []).map((r) => ({
    ...r,
    buyer_name: buyerMap[r.buyer_id] ?? "Comprador",
    listing_title: listingMap[r.listing_id] ?? "Servicio",
  }));

  const avg =
    enriched.length > 0
      ? enriched.reduce((sum, r) => sum + r.rating, 0) / enriched.length
      : 0;

  return NextResponse.json({ reviews: enriched, average: Math.round(avg * 10) / 10, total: enriched.length });
}

/** POST { bookingId, rating, comment? } — buyer submits review */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const bookingId = String(body?.bookingId ?? "").trim();
    const rating = Number(body?.rating);
    const comment = body?.comment ? String(body.comment).trim().slice(0, 1000) : null;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data: booking, error: bErr } = await supabase
      .from("service_bookings")
      .select("id,buyer_id,seller_id,listing_id,payment_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (booking.buyer_id !== userId) {
      return NextResponse.json({ error: "Solo el comprador puede dejar reseña" }, { status: 403 });
    }

    if (booking.payment_status !== "paid") {
      return NextResponse.json({ error: "El pago debe estar completo" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("seller_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ya dejaste una reseña para esta reserva" }, { status: 409 });
    }

    const { data: review, error: insertErr } = await supabase
      .from("seller_reviews")
      .insert({
        seller_id: booking.seller_id,
        buyer_id: userId,
        booking_id: bookingId,
        listing_id: booking.listing_id,
        rating,
        comment,
      })
      .select("id,rating,comment,created_at")
      .single();

    if (insertErr) {
      console.error("[reviews] POST insert error:", insertErr);
      return NextResponse.json({ error: "Error al guardar la reseña" }, { status: 500 });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (e: unknown) {
    console.error("[reviews] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
