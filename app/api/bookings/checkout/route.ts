import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";
import { getStripe, computeCommissionCents, DEFAULT_COMMISSION_PCT } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.naranjogo.com.mx";

/**
 * POST { listingId, note? }
 * Creates a Stripe Checkout Session for the commission fee.
 * Buyer must have contacted the seller in-app first.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const listingId = String((json as { listingId?: string }).listingId ?? "").trim();
    const note = String((json as { note?: string }).note ?? "").trim() || null;

    if (!listingId) {
      return NextResponse.json({ error: "listingId requerido" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data: listing } = await supabase
      .from("listings")
      .select("id,seller_id,category_id,status,title_es,price_mxn,commission_pct")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json({ error: "Anuncio no encontrado" }, { status: 404 });
    }
    if (listing.category_id !== "services") {
      return NextResponse.json({ error: "Solo aplica a servicios" }, { status: 400 });
    }
    if (listing.status !== "active") {
      return NextResponse.json({ error: "Este anuncio no está activo" }, { status: 400 });
    }
    if (listing.seller_id === userId) {
      return NextResponse.json({ error: "No puedes reservar tu propio servicio" }, { status: 400 });
    }

    const { data: gate } = await supabase
      .from("listing_service_contact_gate")
      .select("contacted_in_app,whatsapp_ack_at")
      .eq("listing_id", listingId)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (!gate?.contacted_in_app && !gate?.whatsapp_ack_at) {
      return NextResponse.json(
        { error: "Primero contacta al proveedor por mensajes en la app." },
        { status: 400 }
      );
    }

    const commissionPct = listing.commission_pct ?? DEFAULT_COMMISSION_PCT;
    const commissionCents = computeCommissionCents(listing.price_mxn, commissionPct);

    const { data: booking, error: bookErr } = await supabase
      .from("service_bookings")
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id,
        commission_amount_cents: commissionCents,
        commission_pct: commissionPct,
        note,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (bookErr || !booking) {
      console.error("[checkout] booking insert", bookErr);
      return NextResponse.json({ error: "No se pudo crear la reserva" }, { status: 500 });
    }

    const stripe = getStripe();
    const priceMxn = (commissionCents / 100).toFixed(2);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "mxn",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: commissionCents,
            product_data: {
              name: `Comisión de reserva — ${listing.title_es}`,
              description: `Tarifa de servicio (${commissionPct}%) para conectarte con el proveedor`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id,
      },
      success_url: `${APP_URL}/booking/success?id=${booking.id}`,
      cancel_url: `${APP_URL}/listing/${listingId}?booking_cancelled=1`,
    });

    await supabase
      .from("service_bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return NextResponse.json({ url: session.url, bookingId: booking.id });
  } catch (e) {
    console.error("[checkout] POST", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
