import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings?status=paid
 * Returns the authenticated buyer's bookings (enriched with listing + seller info).
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const statusFilter = req.nextUrl.searchParams.get("status");
  const supabase = createAdminSupabase();

  let query = supabase
    .from("service_bookings")
    .select("id,listing_id,seller_id,commission_amount_cents,payment_status,paid_at,status,created_at")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter === "paid") {
    query = query.eq("payment_status", "paid");
  }

  const { data: bookings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (bookings ?? []).map(async (b: Record<string, unknown>) => {
      const { data: listing } = await supabase
        .from("listings")
        .select("title_es")
        .eq("id", b.listing_id)
        .maybeSingle();

      const { data: seller } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", b.seller_id)
        .maybeSingle();

      return {
        ...b,
        listing_title: listing?.title_es ?? "Servicio",
        seller_name: seller?.display_name ?? "Proveedor",
      };
    })
  );

  return NextResponse.json({ bookings: enriched });
}
