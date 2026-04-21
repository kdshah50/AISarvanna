import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const DEFAULT_REMINDER_DAYS = 90; // 3 months

/**
 * POST /api/reminders { bookingId }
 * Buyer schedules a reminder to rebook a service in 3 months.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = String((body as { bookingId?: string }).bookingId ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "bookingId requerido" }, { status: 400 });

  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from("service_bookings")
    .select("id,buyer_id,seller_id,listing_id,payment_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  if (booking.buyer_id !== userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (booking.payment_status !== "paid") {
    return NextResponse.json({ error: "Solo reservas pagadas" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("booking_reminders")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Ya tienes un recordatorio para esta reserva" }, { status: 409 });

  const remindAt = new Date();
  remindAt.setDate(remindAt.getDate() + DEFAULT_REMINDER_DAYS);

  const { error } = await supabase
    .from("booking_reminders")
    .insert({
      booking_id: bookingId,
      buyer_id: userId,
      seller_id: booking.seller_id,
      listing_id: booking.listing_id,
      remind_at: remindAt.toISOString(),
      channel: "whatsapp",
    });

  if (error) {
    console.error("[reminders] insert error", error);
    return NextResponse.json({ error: "No se pudo crear el recordatorio" }, { status: 500 });
  }

  return NextResponse.json({
    message: "Recordatorio creado",
    remind_at: remindAt.toISOString(),
  }, { status: 201 });
}

/**
 * GET /api/reminders
 * Returns pending reminders for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from("booking_reminders")
    .select("*")
    .eq("buyer_id", userId)
    .order("remind_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminders: data ?? [] });
}
