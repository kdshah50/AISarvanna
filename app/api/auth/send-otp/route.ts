import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || !/^\d{8,15}$/.test(phone)) {
      return NextResponse.json({ error: "Numero invalido" }, { status: 400 });
    }

    const h = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countRes = await fetch(
      `${SUPA_URL}/rest/v1/otp_codes?phone=eq.${phone}&created_at=gte.${oneHourAgo}&select=id`,
      { headers: h }
    );
    const countRows = countRes.ok ? await countRes.json() : [];
    if (countRows.length >= 5) {
      return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
    }

    const code = generateOTP();
    await fetch(`${SUPA_URL}/rest/v1/otp_codes`, {
      method: "POST",
      headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ phone, code, expires_at: new Date(Date.now() + 90 * 1000).toISOString() }),
    });

    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
    if (sid && token && from) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: `whatsapp:+${phone}`,
          Body: `Tu codigo de Naranjogo es: *${code}*
Valido 90 segundos.`,
        }),
      });
    } else {
      console.log(`[DEV OTP] +${phone} -> ${code}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
