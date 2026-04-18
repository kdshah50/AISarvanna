import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { getAdminPin } from "@/lib/admin-pin";

export const dynamic = "force-dynamic";

/** GET ?pin=…  —  list all users (admin only, for diagnostics). */
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");
  if (!pin || pin !== getAdminPin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id,phone,display_name,trust_badge,phone_verified,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/users]", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
