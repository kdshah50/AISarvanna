import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** POST { body } — append message; must be buyer or seller. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const conversationId = params.id;
    const json = await req.json();
    const body = String(json?.body ?? "").trim();
    if (!body || body.length > 4000) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const { data: conv, error: convErr } = await supabase
      .from("listing_conversations")
      .select("id,buyer_id,seller_id,listing_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("listing_messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body })
      .select("id,sender_id,body,created_at")
      .single();

    if (insErr) {
      console.error("[conversations/:id/messages] insert", insErr);
      return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
    }

    await supabase.from("listing_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    if (userId === conv.buyer_id) {
      const { data: listing } = await supabase
        .from("listings")
        .select("category_id")
        .eq("id", conv.listing_id)
        .maybeSingle();
      if (listing?.category_id === "services") {
        const now = new Date().toISOString();
        const { data: gate } = await supabase
          .from("listing_service_contact_gate")
          .select("listing_id")
          .eq("listing_id", conv.listing_id)
          .eq("buyer_id", userId)
          .maybeSingle();
        if (!gate) {
          await supabase.from("listing_service_contact_gate").insert({
            listing_id: conv.listing_id,
            buyer_id: userId,
            contacted_in_app: true,
            updated_at: now,
          });
        } else {
          await supabase
            .from("listing_service_contact_gate")
            .update({ contacted_in_app: true, updated_at: now })
            .eq("listing_id", conv.listing_id)
            .eq("buyer_id", userId);
        }
      }
    }

    return NextResponse.json({ message: inserted });
  } catch (e) {
    console.error("[conversations/:id/messages] POST", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
