import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { getStripe, stripePaymentIntentId } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET ?session_id=cs_xxx
 * Loads booking after Stripe Checkout without requiring auth cookie (fixes post-payment 401
 * when returning from checkout.stripe.com or www/non-www cookie mismatch).
 * Verifies the session with Stripe, syncs DB if webhook has not run yet.
 * Loyalty points are left to the webhook only to avoid double-award.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id inválido" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Pago no completado" }, { status: 402 });
    }

    const bookingId = checkoutSession.metadata?.booking_id;
    if (!bookingId) {
      return NextResponse.json({ error: "Sesión sin reserva" }, { status: 404 });
    }

    const supabase = createAdminSupabase();
    const { data: booking } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (booking.payment_status !== "paid") {
      const now = new Date().toISOString();
      const { data: seller } = await supabase
        .from("users")
        .select("phone")
        .eq("id", booking.seller_id)
        .maybeSingle();

      const intentId = stripePaymentIntentId(checkoutSession.payment_intent);

      const { error: upErr } = await supabase
        .from("service_bookings")
        .update({
          payment_status: "paid",
          ...(intentId ? { stripe_payment_intent_id: intentId } : {}),
          paid_at: now,
          seller_phone_snapshot: seller?.phone ?? null,
          contact_revealed_at: now,
          status: "confirmed",
          updated_at: now,
        })
        .eq("id", bookingId);

      if (upErr) {
        console.error("[verify-session] booking update", upErr);
        return NextResponse.json({ error: "No se pudo confirmar la reserva" }, { status: 500 });
      }
    }

    const { data: fresh } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (!fresh) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("title_es,photo_urls,price_mxn")
      .eq("id", fresh.listing_id)
      .maybeSingle();

    const { data: seller } = await supabase
      .from("users")
      .select("display_name,avatar_url,phone,whatsapp_optin")
      .eq("id", fresh.seller_id)
      .maybeSingle();

    const isPaid = fresh.payment_status === "paid";
    const phone = isPaid ? (fresh.seller_phone_snapshot || seller?.phone) : null;
    const waDigits = phone?.replace(/\D/g, "") ?? "";
    const waUrl =
      isPaid && waDigits
        ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
            `Hola! Ya reservé tu servicio "${listing?.title_es ?? ""}" en Naranjogo.`
          )}`
        : null;

    return NextResponse.json(
      {
        id: fresh.id,
        listingId: fresh.listing_id,
        paymentStatus: fresh.payment_status,
        status: fresh.status,
        commissionAmountCents: fresh.commission_amount_cents,
        commissionPct: fresh.commission_pct,
        paidAt: fresh.paid_at,
        createdAt: fresh.created_at,
        isBuyer: true,
        listing: listing
          ? {
              title: listing.title_es,
              photo: listing.photo_urls?.[0] ?? null,
              priceMxn: listing.price_mxn,
            }
          : null,
        seller: seller
          ? {
              displayName: seller.display_name,
              avatarUrl: seller.avatar_url,
            }
          : null,
        contact: isPaid ? { phone, whatsappUrl: waUrl } : null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("[verify-session] GET", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
