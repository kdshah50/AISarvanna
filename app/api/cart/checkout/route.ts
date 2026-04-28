import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest, isSameUserId } from "@/lib/auth-server";
import { getPublicAppUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { marketplaceApplicationFeeCents } from "@/lib/marketplace-cart-pricing";
import { computeCartPricing, resolveCartLines, loadSellerConnectId, type CartItemPayload } from "@/lib/marketplace-cart-server";
import { randomUUID } from "crypto";
import { marketplaceConnectRequired } from "@/lib/marketplace-stripe-mode";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = getPublicAppUrl();

/** POST { items: { listingId, qty }[] } — Stripe Checkout for goods cart (Connect or platform-only). */
export async function POST(req: NextRequest) {
  try {
    const buyerId = await getUserIdFromRequest(req);
    if (!buyerId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items = body?.items as CartItemPayload[] | undefined;
    const supabase = createAdminSupabase();
    const resolved = await resolveCartLines(supabase, items ?? []);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    if (isSameUserId(resolved.sellerId, buyerId)) {
      return NextResponse.json({ error: "No puedes comprar tu propio anuncio" }, { status: 400 });
    }

    const useConnect = marketplaceConnectRequired();
    const connectId = useConnect ? await loadSellerConnectId(supabase, resolved.sellerId) : null;
    if (useConnect && !connectId) {
      return NextResponse.json(
        {
          error: "seller_payouts_pending",
          message:
            "Este vendedor aún no activa cobros con Stripe. Puedes contactarlo por mensajes o WhatsApp (tarifa de conexión).",
        },
        { status: 409 }
      );
    }

    const pricing = computeCartPricing(resolved.lines);
    if (pricing.totalCents <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    }

    const applicationFeeCents = marketplaceApplicationFeeCents(pricing);
    const orderId = randomUUID();

    const lineItemsJson = pricing.lines.map((l) => ({
      listing_id: l.listingId,
      title_es: l.titleEs,
      qty: l.qty,
      unit_price_mxn_cents: l.unitPriceMxnCents,
      line_subtotal_cents: l.lineSubtotalCents,
      commission_pct: l.commissionPct ?? null,
      line_commission_cents: l.lineCommissionCents,
    }));

    const { error: insErr } = await supabase.from("marketplace_orders").insert({
      id: orderId,
      buyer_id: buyerId,
      seller_id: resolved.sellerId,
      status: "pending",
      subtotal_cents: pricing.subtotalCents,
      commission_cents: pricing.commissionCents,
      vat_cents: pricing.vatCents,
      total_cents: pricing.totalCents,
      application_fee_cents: applicationFeeCents,
      line_items: lineItemsJson,
    });

    if (insErr) {
      console.error("[cart/checkout] order insert", insErr);
      return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
    }

    const stripe = getStripe();
    const vatPct = pricing.vatPercent;

    const itemDesc = useConnect
      ? `${pricing.lines.length} artículo(s) — pago al vendedor vía Stripe Connect`
      : `${pricing.lines.length} artículo(s) — pago a la plataforma (modo sin Connect; reparto al vendedor manual)`;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        currency: "mxn",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              unit_amount: pricing.subtotalCents,
              product_data: {
                name: "Artículos (vendedor)",
                description: itemDesc,
              },
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "mxn",
              unit_amount: pricing.commissionCents,
              product_data: {
                name: "AISaravanna platform fee (commission)",
                description: "Comisión de plataforma según cada anuncio (definida por admin)",
              },
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "mxn",
              unit_amount: pricing.vatCents,
              product_data: {
                name: `IVA (${vatPct}%)`,
                description: "Impuesto sobre subtotal + comisión",
              },
            },
            quantity: 1,
          },
        ],
        ...(useConnect && connectId
          ? {
              payment_intent_data: {
                application_fee_amount: applicationFeeCents,
                transfer_data: { destination: connectId },
                metadata: {
                  marketplace_order_id: orderId,
                  buyer_id: buyerId,
                  seller_id: resolved.sellerId,
                },
              },
            }
          : {}),
        metadata: {
          order_kind: "marketplace",
          marketplace_order_id: orderId,
          buyer_id: buyerId,
          seller_id: resolved.sellerId,
          marketplace_stripe_mode: useConnect ? "connect" : "platform",
        },
        success_url: `${APP_URL}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/cart?cancelled=1`,
      });
    } catch (err: unknown) {
      console.error("[cart/checkout] Stripe session", err);
      await supabase.from("marketplace_orders").delete().eq("id", orderId);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Stripe error";
      return NextResponse.json(
        { error: "No se pudo iniciar el pago.", detail: msg },
        { status: 502 }
      );
    }

    await supabase
      .from("marketplace_orders")
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    return NextResponse.json({ url: session.url, orderId });
  } catch (e: unknown) {
    console.error("[cart/checkout]", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
