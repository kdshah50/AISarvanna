/**
 * Optional transactional email for booking reminders (Resend).
 * If RESEND_API_KEY / REMINDER_EMAIL_FROM are unset, sends are skipped (returns false).
 */
export async function sendReminderEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REMINDER_EMAIL_FROM?.trim();
  if (!key || !from) {
    console.warn("[reminder-email] RESEND_API_KEY or REMINDER_EMAIL_FROM not set; skipping email");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to.trim()], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[reminder-email]", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[reminder-email]", e);
    return false;
  }
}
