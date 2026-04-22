import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";

const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

/**
 * GET ?pin=&filter=pending|verified|all
 * Server-only listing queue for admin (replaces direct anon PostgREST after RLS).
 */
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin")?.trim() ?? "";
  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const filter = req.nextUrl.searchParams.get("filter") ?? "pending";
  const supabase = createAdminSupabase();

  let q = supabase
    .from("listings")
    .select(
      "id,title_es,description_es,price_mxn,category_id,is_verified,status,location_city,commission_pct,created_at,users!fk_listings_seller(display_name,phone)"
    )
    .eq("category_id", "services")
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter === "pending") {
    q = q.eq("is_verified", false).eq("status", "active");
  } else if (filter === "verified") {
    q = q.eq("is_verified", true).eq("status", "active");
  } else {
    q = q.eq("status", "active");
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin/listing-queue]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
