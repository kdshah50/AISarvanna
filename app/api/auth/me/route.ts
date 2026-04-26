import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest, idMatchVariantsForIn } from "@/lib/auth-server";
import { signedInePhotoUrl } from "@/lib/ine-storage";

/** Session + profile payload for /profile (bypasses RLS that blocks anon reads on users/listings). */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = createAdminSupabase();

    let user: any = null;
    let userError: any = null;

    const fullSelect =
      "id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,ine_photo_url,stripe_connect_account_id,created_at";
    const midSelect = "id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,created_at";
    const baseSelect = "id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at";
    const idVars = idMatchVariantsForIn(userId);

    ({ data: user, error: userError } = await supabase
      .from("users").select(fullSelect).in("id", idVars).maybeSingle());

    if (userError?.message?.includes("does not exist")) {
      ({ data: user, error: userError } = await supabase
        .from("users").select(midSelect).in("id", idVars).maybeSingle());
    }
    if (userError?.message?.includes("does not exist")) {
      ({ data: user, error: userError } = await supabase
        .from("users").select(baseSelect).in("id", idVars).maybeSingle());
    }

    if (userError) {
      console.error("[auth/me] user", userError);
      return NextResponse.json({ error: "No se pudo cargar el perfil" }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.ine_photo_url) {
      const signed = await signedInePhotoUrl(supabase, user.ine_photo_url as string);
      if (signed) user.ine_photo_url = signed;
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id,title_es,price_mxn,status,is_verified,category_id,location_city,created_at")
      .in("seller_id", idMatchVariantsForIn(userId))
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

    const supabase = createAdminSupabase();
    let data: any = null;
    let error: any = null;
    const idVars = idMatchVariantsForIn(userId);

    ({ data, error } = await supabase
      .from("users").update({ display_name: displayName }).in("id", idVars)
      .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,ine_photo_url,created_at")
      .maybeSingle());

    if (error?.message?.includes("does not exist")) {
      ({ data, error } = await supabase
        .from("users").update({ display_name: displayName }).in("id", idVars)
        .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,curp,created_at")
        .maybeSingle());
    }
    if (error?.message?.includes("does not exist")) {
      ({ data, error } = await supabase
        .from("users").update({ display_name: displayName }).in("id", idVars)
        .select("id,phone,display_name,trust_badge,phone_verified,ine_verified,created_at")
        .maybeSingle());
    }

    if (error || !data) {
      console.error("[auth/me] PATCH", error);
      return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
    }

    if (data.ine_photo_url) {
      const signed = await signedInePhotoUrl(supabase, data.ine_photo_url as string);
      if (signed) data.ine_photo_url = signed;
    }

    return NextResponse.json({ user: data });
  } catch (e: any) {
    console.error("[auth/me] PATCH", e);
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}
