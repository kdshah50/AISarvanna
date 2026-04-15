import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Server-side admin actions (service role bypasses RLS). PIN must match env. */
function adminPin(): string {
  return process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";
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

    const supabase = createAdminSupabase();

    if (action === "approve") {
      const raw = body?.commission_pct;
      const pct =
        typeof raw === "number" && !Number.isNaN(raw)
          ? raw
          : parseFloat(String(raw ?? "5"));
      const commission_pct = Number.isFinite(pct) ? Math.min(30, Math.max(0, pct)) : 5;

      const { error } = await supabase
        .from("listings")
        .update({ is_verified: true, commission_pct })
        .eq("id", id);

      if (error) {
        console.error("[admin/listing] approve", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("listings")
        .update({ status: "archived", is_verified: false })
        .eq("id", id);

      if (error) {
        console.error("[admin/listing] reject", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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

      const { error } = await supabase.from("listings").update({ commission_pct }).eq("id", id);

      if (error) {
        console.error("[admin/listing] commission", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e: any) {
    console.error("[admin/listing] POST", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
