import { createAdminSupabase } from "@/lib/auth-server";
import { getPublicAppUrl } from "@/lib/app-url";
import { sendReminderEmail } from "@/lib/reminder-email";
import { sendWhatsApp } from "@/lib/twilio";

const MAX_ATTEMPTS = 5;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ReminderRow = {
  id: string;
  booking_id: string;
  buyer_id: string;
  listing_id: string;
  reminder_kind: string;
  notify_whatsapp: boolean | null;
  notify_email: boolean | null;
  delivery_email: string | null;
  attempt_count: number | null;
};

/**
 * Sends due booking reminders (WhatsApp + optional email). Idempotent per row until sent or failed.
 */
export async function processDueBookingReminders(limit = 35): Promise<{
  processed: number;
  failedAttempts: number;
  skippedNoChannel: number;
}> {
  const supabase = createAdminSupabase();
  const now = new Date().toISOString();
  let processed = 0;
  let failedAttempts = 0;
  let skippedNoChannel = 0;

  const { data: rows, error: qErr } = await supabase
    .from("booking_reminders")
    .select(
      "id,booking_id,buyer_id,listing_id,reminder_kind,notify_whatsapp,notify_email,delivery_email,attempt_count",
    )
    .eq("status", "pending")
    .lte("remind_at", now)
    .order("remind_at", { ascending: true })
    .limit(limit);

  if (qErr) throw new Error(qErr.message);

  const appUrl = getPublicAppUrl();

  for (const row of (rows ?? []) as ReminderRow[]) {
    const attempts = row.attempt_count ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      await supabase.from("booking_reminders").update({ status: "failed" }).eq("id", row.id);
      continue;
    }

    const notifyWa = row.notify_whatsapp !== false;
    const notifyEm = row.notify_email === true;
    if (!notifyWa && !notifyEm) {
      await supabase.from("booking_reminders").update({ status: "failed" }).eq("id", row.id);
      skippedNoChannel++;
      continue;
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("title_es")
      .eq("id", row.listing_id)
      .maybeSingle();

    const { data: buyer } = await supabase
      .from("users")
      .select("phone,display_name")
      .eq("id", row.buyer_id)
      .maybeSingle();

    const title = listing?.title_es ?? "tu servicio";
    const link = `${appUrl}/listing/${row.listing_id}`;
    const name = buyer?.display_name?.trim();
    const helloEn = name ? `Hi ${name}` : "Hi";
    const msg =
      row.reminder_kind === "appointment"
        ? `${helloEn}: reminder for your upcoming appointment for "${title}". Open AISaravanna: ${link}`
        : `${helloEn}: good time to rebook "${title}". Open your listing: ${link}`;

    let anyOk = false;

    if (notifyWa && buyer?.phone) {
      const ok = await sendWhatsApp(buyer.phone, msg);
      if (ok) anyOk = true;
    }

    if (notifyEm && row.delivery_email?.includes("@")) {
      const ok = await sendReminderEmail({
        to: row.delivery_email,
        subject: `Reminder — ${title.slice(0, 80)}`,
        html: `<p>${escapeHtml(msg)}</p><p><a href="${escapeHtml(link)}">Open AISaravanna</a></p>`,
      });
      if (ok) anyOk = true;
    }

    if (anyOk) {
      await supabase
        .from("booking_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      processed++;
    } else {
      await supabase
        .from("booking_reminders")
        .update({ attempt_count: attempts + 1 })
        .eq("id", row.id);
      failedAttempts++;
    }
  }

  return { processed, failedAttempts, skippedNoChannel };
}
