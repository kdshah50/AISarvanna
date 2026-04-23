import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest, isSameUserId } from "@/lib/auth-server";
import { isServicesListing } from "@/lib/listing-category";
import { buyerHasSentInAppMessage, ensureContactGateFromMessages } from "@/lib/contact-gate";
import { computeCommissionCents } from "@/lib/stripe";
import { effectiveListingPriceMxnCents, listingHasActivePackage } from "@/lib/package-pricing";

export const dynamic = "force-dynamic";

async function loadListing(supabase: ReturnType<typeof createAdminSupabase>, listingId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id,seller_id,category_id,status,title_es")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !data) return { listing: null as null | Record<string, unknown>, error };
  return { listing: data, error: null };
}

/** GET — buyer: contact gate + whether they can submit a booking request; anon: isService only. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const listingId = params.id;
    const supabase = createAdminSupabase();
    const { listing, error: le } = await loadListing(supabase, listingId);
    if (le || !listing) {
      return NextResponse.json({ error: "Anuncio no encontrado" }, { status: 404 });
    }

    const isService = isServicesListing(listing);
    const sellerId = listing.seller_id as string | null;

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({
        isService,
        needLogin: true,
        canBook: false,
        contactedInApp: false,
        whatsappAcked: false,
      });
    }

    if (sellerId && isSameUserId(userId, sellerId)) {
      return NextResponse.json({
        isService,
        isSeller: true,
        canBook: false,
        contactedInApp: false,
        whatsappAcked: false,
      });
    }

    if (!isService) {
      return NextResponse.json({
        isService: false,
        canBook: false,
        contactedInApp: false,
        whatsappAcked: false,
      });
    }

    const { data: gate } = await supabase
      .from("listing_service_contact_gate")
      .select("contacted_in_app,whatsapp_ack_at")
      .eq("listing_id", listingId)
      .eq("buyer_id", userId)
      .maybeSingle();

    let contactedInApp = Boolean(gate?.contacted_in_app);
    const whatsappAcked = Boolean(gate?.whatsapp_ack_at);

    if (!contactedInApp && !whatsappAcked) {
      const sent = await buyerHasSentInAppMessage(supabase, listingId, userId);
      if (sent) {
        contactedInApp = true;
        await ensureContactGateFromMessages(supabase, listingId, userId);
      }
    }

    const hasContacted = contactedInApp || whatsappAcked;

    const { data: paidBookings } = await supabase
      .from("service_bookings")
      .select("id,payment_status,seller_phone_snapshot,paid_at")
      .eq("listing_id", listingId)
      .eq("buyer_id", userId)
      .eq("payment_status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1);

    const latestPaid = paidBookings?.[0] ?? null;

    let revealedPhone: string | null = null;
    let revealedWhatsappUrl: string | null = null;
    if (latestPaid) {
      revealedPhone = latestPaid.seller_phone_snapshot;
      if (!revealedPhone) {
        const { data: sellerUser } = await supabase
          .from("users")
          .select("phone")
          .eq("id", listing.seller_id)
          .maybeSingle();
        revealedPhone = sellerUser?.phone ?? null;
      }
      if (revealedPhone) {
        const digits = revealedPhone.replace(/\D/g, "");
        revealedWhatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(
          `Hola! Ya reservé tu servicio "${listing.title_es}" en Naranjogo.`
        )}`;
      }
    }

    const { data: pendingBookings } = await supabase
      .from("service_bookings")
      .select("id,stripe_checkout_session_id")
      .eq("listing_id", listingId)
      .eq("buyer_id", userId)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    const pendingBooking = pendingBookings?.[0] ?? null;

    const { data: listingPricing } = await supabase
      .from("listings")
      .select("price_mxn,commission_pct,package_session_count,package_total_price_mxn")
      .eq("id", listingId)
      .maybeSingle();

    const commPct = Number(listingPricing?.commission_pct ?? 10);
    const base = effectiveListingPriceMxnCents({
      price_mxn: Number(listingPricing?.price_mxn) || 0,
      package_session_count: listingPricing?.package_session_count,
      package_total_price_mxn: listingPricing?.package_total_price_mxn,
    });
    const commCents = computeCommissionCents(base, commPct);
    const hasPackage = listingHasActivePackage({
      package_session_count: listingPricing?.package_session_count,
      package_total_price_mxn: listingPricing?.package_total_price_mxn,
    });

    return NextResponse.json({
      isService: true,
      canBook: hasContacted,
      contactedInApp,
      whatsappAcked,
      hasPaidBooking: !!latestPaid,
      paidBookingId: latestPaid?.id ?? null,
      revealedPhone,
      revealedWhatsappUrl,
      hasPendingBooking: !!pendingBooking,
      pendingBookingId: pendingBooking?.id ?? null,
      commissionAmountCents: commCents,
      commissionPct: commPct,
      hasPackage,
      packageSessionCount: hasPackage ? listingPricing?.package_session_count : null,
      packageTotalMxnCents: hasPackage ? listingPricing?.package_total_price_mxn : null,
    });
  } catch (e) {
    console.error("[service-booking] GET", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

/** POST { action: "ack_whatsapp" } | { action: "request", note, preferred_at? } */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const listingId = params.id;
    const json = await req.json().catch(() => ({}));
    const action = String((json as { action?: string }).action ?? "");

    const supabase = createAdminSupabase();
    const { listing, error: le } = await loadListing(supabase, listingId);
    if (le || !listing) {
      return NextResponse.json({ error: "Anuncio no encontrado" }, { status: 404 });
    }

    if (!isServicesListing(listing)) {
      return NextResponse.json({ error: "Solo aplica a servicios" }, { status: 400 });
    }

    const sellerId = listing.seller_id as string | null;
    if (!sellerId) {
      return NextResponse.json({ error: "Anuncio sin proveedor" }, { status: 400 });
    }
    if (isSameUserId(sellerId, userId)) {
      return NextResponse.json({ error: "No puedes reservar tu propio anuncio" }, { status: 400 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Este anuncio no está activo" }, { status: 400 });
    }

    if (action === "ack_whatsapp") {
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from("listing_service_contact_gate")
        .select("listing_id,buyer_id,contacted_in_app")
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .maybeSingle();

      if (!existing) {
        const { error: ins } = await supabase.from("listing_service_contact_gate").insert({
          listing_id: listingId,
          buyer_id: userId,
          contacted_in_app: false,
          whatsapp_ack_at: now,
          updated_at: now,
        });
        if (ins) {
          console.error("[service-booking] ack insert", ins);
          return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
        }
      } else {
        const { error: up } = await supabase
          .from("listing_service_contact_gate")
          .update({ whatsapp_ack_at: now, updated_at: now })
          .eq("listing_id", listingId)
          .eq("buyer_id", userId);
        if (up) {
          console.error("[service-booking] ack update", up);
          return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "request") {
      const note = String((json as { note?: string }).note ?? "").trim();
      if (!note || note.length > 2000) {
        return NextResponse.json({ error: "Describe tu solicitud (1–2000 caracteres)" }, { status: 400 });
      }

      const prefRaw = (json as { buyer_preference_text?: string }).buyer_preference_text;
      const buyer_preference_text =
        typeof prefRaw === "string" && prefRaw.trim().length > 0
          ? prefRaw.trim().slice(0, 500)
          : null;

      const { data: gate } = await supabase
        .from("listing_service_contact_gate")
        .select("contacted_in_app,whatsapp_ack_at")
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .maybeSingle();

      const contactedInApp = Boolean(gate?.contacted_in_app);
      const whatsappAcked = Boolean(gate?.whatsapp_ack_at);
      if (!contactedInApp && !whatsappAcked) {
        return NextResponse.json(
          { error: "Primero contacta al proveedor por mensajes en la app o por WhatsApp." },
          { status: 400 }
        );
      }

      const { data: created, error: insErr } = await supabase
        .from("service_booking_requests")
        .insert({
          listing_id: listingId,
          buyer_id: userId,
          note,
          buyer_preference_text,
        })
        .select("id,created_at")
        .single();

      if (insErr) {
        console.error("[service-booking] request insert", insErr);
        return NextResponse.json({ error: "No se pudo enviar la solicitud" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, request: created });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (e) {
    console.error("[service-booking] POST", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
