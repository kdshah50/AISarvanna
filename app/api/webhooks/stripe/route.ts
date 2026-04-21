import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { getStripe, stripePaymentIntentId } from "@/lib/stripe";
import { awardPoints } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;
    if (!bookingId) {
      console.error("[stripe-webhook] No booking_id in metadata");
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminSupabase();
    const now = new Date().toISOString();

    const { data: seller } = await supabase
      .from("users")
      .select("phone")
      .eq("id", session.metadata?.seller_id ?? "")
      .maybeSingle();

    const intentId = stripePaymentIntentId(session.payment_intent);

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
      console.error("[stripe-webhook] booking update failed", upErr);
    }

    // Award loyalty points (non-blocking — errors here should not fail the webhook)
    const buyerId = session.metadata?.buyer_id;
    const amountPaid = session.amount_total;
    if (buyerId && amountPaid && amountPaid > 0) {
      try {
        await awardPoints(supabase, buyerId, bookingId, amountPaid);
      } catch (loyaltyErr) {
        console.error("[stripe-webhook] loyalty award failed (non-fatal)", loyaltyErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
