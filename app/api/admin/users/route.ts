import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { getAdminPin } from "@/lib/admin-pin";

export const dynamic = "force-dynamic";

/** GET ?pin=…  —  list all users (admin only). */
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");
  if (!pin || pin !== getAdminPin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  let data: any[] | null = null;
  let error: any = null;

  ({ data, error } = await supabase
    .from("users")
    .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,ine_photo_url,created_at")
    .order("created_at", { ascending: false }));

  if (error?.message?.includes("does not exist")) {
    ({ data, error } = await supabase
      .from("users")
      .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,created_at")
      .order("created_at", { ascending: false }));
  }
  if (error?.message?.includes("does not exist")) {
    ({ data, error } = await supabase
      .from("users")
      .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at")
      .order("created_at", { ascending: false }));
  }

  if (error) {
    console.error("[admin/users]", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

/** PATCH — update trust_badge / ine_verified for a user. */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "").trim();
    if (!pin || pin !== getAdminPin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(body?.userId ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const updates: Record<string, unknown> = {};

    if (body.trust_badge !== undefined) {
      const valid = ["none", "bronze", "gold", "diamond"];
      if (!valid.includes(body.trust_badge)) {
        return NextResponse.json({ error: `trust_badge must be one of: ${valid.join(", ")}` }, { status: 400 });
      }
      updates.trust_badge = body.trust_badge;
    }

    if (body.ine_verified !== undefined) {
      updates.ine_verified = Boolean(body.ine_verified);
    }

    if (body.display_name !== undefined) {
      updates.display_name = String(body.display_name).trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id,trust_badge,ine_verified,display_name")
      .maybeSingle();

    if (error) {
      console.error("[admin/users] PATCH", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (e: unknown) {
    console.error("[admin/users] PATCH", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
