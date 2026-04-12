import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { phone } = await req.json();
    if (!phone || !/^\d{8,15}$/.test(phone)) {
      return NextResponse.json({ error: "Número inválido" }, { status: 400 });
    }

    // Rate limit: 5 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
    }

    const code = generateOTP();
    await supabase.from("otp_codes").insert({
      phone, code, expires_at: new Date(Date.now() + 90 * 1000).toISOString(),
    });

    // Twilio WhatsApp (set env vars in Vercel to enable)
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
          Body: `Tu código de Tianguis es: *${code}*\nVálido 90 segundos. No lo compartas.`,
        }),
      });
    } else {
      // Dev: log to Vercel function logs
      console.log(`[DEV OTP] +${phone} → ${code}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
