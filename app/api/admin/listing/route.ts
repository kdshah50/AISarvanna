import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * Must match `app/admin/page.tsx` gate. If env is unset everywhere, client defaults
 * to "naranjogo2026" — server used to default to "" and rejected every approve (401).
 */
function adminPin(): string {
  return process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "naranjogo2026";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "");
    if (!pin || pin !== adminPin()) {
      return NextResponse.json({ error: "PIN incorrecto o no configurado en el servidor" }, { status: 401 });
    }

    const id = String(body?.id ?? "");
    const action = String(body?.action ?? "") as "approve" | "reject" | "commission";
    if (!id || !action) {
      return NextResponse.json({ error: "id y action requeridos" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createAdminSupabase();
    } catch (e: any) {
      console.error("[admin/listing] supabase", e);
      return NextResponse.json(
        { error: "Servidor sin SUPABASE_SERVICE_ROLE_KEY o URL de Supabase" },
        { status: 500 }
      );
    }

    if (action === "approve") {
      const raw = body?.commission_pct;
      const pct =
        typeof raw === "number" && !Number.isNaN(raw)
          ? raw
          : parseFloat(String(raw ?? "5"));
      const commission_pct = Number.isFinite(pct) ? Math.min(30, Math.max(0, pct)) : 5;

      const { data, error } = await supabase
        .from("listings")
        .update({ is_verified: true, commission_pct })
        .eq("id", id.trim())
        .select("id");

      if (error) {
        console.error("[admin/listing] approve", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data?.length) {
        return NextResponse.json(
          { error: "No se actualizó ningún anuncio (id no encontrado o distinto tipo en BD)" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      const { data, error } = await supabase
        .from("listings")
        .update({ status: "archived", is_verified: false })
        .eq("id", id.trim())
        .select("id");

      if (error) {
        console.error("[admin/listing] reject", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data?.length) {
        return NextResponse.json(
          { error: "No se actualizó ningún anuncio (id no encontrado)" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "commission") {
      const raw = body?.commission_pct;
      const pct =
        typeof raw === "number" && !Number.isNaN(raw)
          ? raw
          : parseFloat(String(raw ?? "5"));
      const commission_pct = Number.isFinite(pct) ? Math.min(30, Math.max(0, pct)) : 5;

      const { data, error } = await supabase
        .from("listings")
        .update({ commission_pct })
        .eq("id", id.trim())
        .select("id");

      if (error) {
        console.error("[admin/listing] commission", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data?.length) {
        return NextResponse.json({ error: "No se encontró el anuncio" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e: any) {
    console.error("[admin/listing] POST", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
