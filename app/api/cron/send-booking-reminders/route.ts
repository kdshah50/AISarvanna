import { NextRequest, NextResponse } from "next/server";
import { processDueBookingReminders } from "@/lib/booking-reminders-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron: GET Authorization: Bearer ${CRON_SECRET}
 * Sends pending booking_reminders where remind_at <= now (WhatsApp + optional Resend email).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueBookingReminders(35);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[cron/send-booking-reminders]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
