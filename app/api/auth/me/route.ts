import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tianguis_token";

function jwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "tianguis_dev_secret_change_in_production");
}

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    const sub = payload.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Session + profile payload for /profile (bypasses RLS that blocks anon reads on users/listings). */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = adminSupabase();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("[auth/me] user", userError);
      return NextResponse.json({ error: "No se pudo cargar el perfil" }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id,title_es,price_mxn,status,is_verified,category_id,location_city,created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (listingsError) {
      console.error("[auth/me] listings", listingsError);
      return NextResponse.json({ user, listings: [] });
    }

    return NextResponse.json({ user, listings: listings ?? [] });
  } catch (e: any) {
    console.error("[auth/me] GET", e);
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const displayName = String(body?.display_name ?? "").trim();
    if (!displayName) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }

    const supabase = adminSupabase();
    const { data, error } = await supabase
      .from("users")
      .update({ display_name: displayName })
      .eq("id", userId)
      .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at")
      .maybeSingle();

    if (error || !data) {
      console.error("[auth/me] PATCH", error);
      return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (e: any) {
    console.error("[auth/me] PATCH", e);
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}
