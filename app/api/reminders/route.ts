import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const REBOOK_DAYS = new Set([7, 14, 30, 90, 180]);
const REMIND_BEFORE_HOURS_ALLOWED = new Set([1, 6, 24, 48, 72]);

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * POST /api/reminders
 * Body:
 * - rebook: { bookingId, kind?: "rebook", rebookInDays, notifyWhatsapp?, notifyEmail?, deliveryEmail? }
 * - appointment: { bookingId, kind: "appointment", appointmentAt (ISO), remindBeforeHours?, notifyWhatsapp?, notifyEmail?, deliveryEmail? }
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = String((body as { bookingId?: string }).bookingId ?? "").trim();
  const kind = ((body as { kind?: string }).kind ?? "rebook").toLowerCase() === "appointment"
    ? "appointment"
    : "rebook";

  if (!bookingId) return NextResponse.json({ error: "bookingId requerido" }, { status: 400 });

  let notifyWhatsapp = (body as { notifyWhatsapp?: boolean }).notifyWhatsapp !== false;
  const notifyEmail = (body as { notifyEmail?: boolean }).notifyEmail === true;
  const deliveryEmail = String((body as { deliveryEmail?: string }).deliveryEmail ?? "").trim();

  if (!notifyWhatsapp && !notifyEmail) {
    return NextResponse.json({ error: "Elige al menos WhatsApp o correo" }, { status: 400 });
  }
  if (notifyEmail && !isEmail(deliveryEmail)) {
    return NextResponse.json({ error: "Correo inválido para el recordatorio" }, { status: 400 });
  }

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

  let remindAt: Date;
  let offsetDays: number | null = null;
  let appointmentAt: string | null = null;
  let remindBeforeHours: number | null = null;

  if (kind === "rebook") {
    const days = Number((body as { rebookInDays?: number }).rebookInDays);
    if (!Number.isInteger(days) || !REBOOK_DAYS.has(days)) {
      return NextResponse.json(
        { error: "rebookInDays debe ser uno de: 7, 14, 30, 90, 180" },
        { status: 400 },
      );
    }
    offsetDays = days;
    remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + days);
  } else {
    const rawAt = String((body as { appointmentAt?: string }).appointmentAt ?? "").trim();
    const apptMs = Date.parse(rawAt);
    if (!Number.isFinite(apptMs)) {
      return NextResponse.json({ error: "appointmentAt inválido (usa fecha ISO)" }, { status: 400 });
    }
    let beforeH = Number((body as { remindBeforeHours?: number }).remindBeforeHours ?? 24);
    if (!REMIND_BEFORE_HOURS_ALLOWED.has(beforeH)) beforeH = 24;
    remindBeforeHours = beforeH;
    appointmentAt = new Date(apptMs).toISOString();

    remindAt = new Date(apptMs - beforeH * 60 * 60 * 1000);
    const minLead = Date.now() + 90_000;
    if (remindAt.getTime() < minLead) {
      return NextResponse.json(
        { error: "La fecha de aviso ya pasó o es demasiado pronto; elige otra cita u horas de anticipación." },
        { status: 400 },
      );
    }
    if (apptMs <= Date.now()) {
      return NextResponse.json({ error: "La cita debe ser en el futuro" }, { status: 400 });
    }
  }

  await supabase
    .from("booking_reminders")
    .delete()
    .eq("booking_id", bookingId)
    .eq("buyer_id", userId)
    .eq("reminder_kind", kind)
    .eq("status", "pending");

  const channel = notifyEmail && !notifyWhatsapp ? "email" : "whatsapp";

  const { error } = await supabase.from("booking_reminders").insert({
    booking_id: bookingId,
    buyer_id: userId,
    seller_id: booking.seller_id,
    listing_id: booking.listing_id,
    remind_at: remindAt.toISOString(),
    channel,
    status: "pending",
    reminder_kind: kind,
    offset_days: offsetDays,
    appointment_at: appointmentAt,
    remind_before_hours: remindBeforeHours,
    notify_whatsapp: notifyWhatsapp,
    notify_email: notifyEmail,
    delivery_email: notifyEmail ? deliveryEmail : null,
    attempt_count: 0,
  });

  if (error) {
    console.error("[reminders] insert error", error);
    return NextResponse.json({ error: "No se pudo crear el recordatorio" }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Recordatorio creado",
      remind_at: remindAt.toISOString(),
      kind,
    },
    { status: 201 },
  );
}

/**
 * GET /api/reminders — pending + recent sent for current user (with listing title).
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from("booking_reminders")
    .select("*")
    .eq("buyer_id", userId)
    .in("status", ["pending", "sent"])
    .order("remind_at", { ascending: true })
    .limit(80);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))];
  const titles: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await supabase.from("listings").select("id,title_es").in("id", listingIds);
    for (const l of listings ?? []) {
      if (l.id) titles[l.id] = l.title_es ?? "";
    }
  }

  const reminders = rows.map((r) => ({
    ...r,
    listing_title: titles[r.listing_id] ?? null,
  }));

  return NextResponse.json({ reminders });
}

/**
 * PATCH /api/reminders { id } — dismiss (cancel) a pending reminder.
 */
export async function PATCH(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String((body as { id?: string }).id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminSupabase();
  const { data: row } = await supabase
    .from("booking_reminders")
    .select("id,status")
    .eq("id", id)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Solo se pueden cancelar recordatorios pendientes" }, { status: 400 });
  }

  const { error } = await supabase
    .from("booking_reminders")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("buyer_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
