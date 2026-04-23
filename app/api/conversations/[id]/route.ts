import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSupabase,
  getUserIdFromRequest,
  idMatchVariantsForIn,
  isSameUserId,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** GET — full thread if participant. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const conversationId = params.id;
    const supabase = createAdminSupabase();
    const idVars = idMatchVariantsForIn(conversationId);

    const { data: conv, error: convErr } = await supabase
      .from("listing_conversations")
      .select("id,listing_id,buyer_id,seller_id,updated_at")
      .in("id", idVars)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const convRowId = conv.id;

    if (!isSameUserId(conv.buyer_id, userId) && !isSameUserId(conv.seller_id, userId)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("id,title_es,seller_id")
      .eq("id", conv.listing_id)
      .maybeSingle();

    const { data: messages, error: msgErr } = await supabase
      .from("listing_messages")
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", convRowId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("[conversations/:id] messages", msgErr);
      return NextResponse.json({ error: "No se pudo cargar mensajes" }, { status: 500 });
    }

    const isSeller = isSameUserId(conv.seller_id, userId);
    const otherId = isSeller ? conv.buyer_id : conv.seller_id;
    let otherName = "";
    if (otherId) {
      const { data: otherUser } = await supabase
        .from("users")
        .select("display_name,phone")
        .eq("id", otherId)
        .maybeSingle();
      otherName = otherUser?.display_name?.trim()
        || (otherUser?.phone ? `…${otherUser.phone.replace(/\D/g, "").slice(-4)}` : "");
    }

    return NextResponse.json({
      conversation: conv,
      listing: listing ?? { id: conv.listing_id, title_es: "", seller_id: conv.seller_id },
      messages: messages ?? [],
      role: isSeller ? "seller" : "buyer",
      other_name: otherName,
    });
  } catch (e) {
    console.error("[conversations/:id] GET", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
