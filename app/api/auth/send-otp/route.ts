import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";
=======
import { createClient } from "@supabase/supabase-js";
import { isValidAuthPhone, normalizeAuthPhone } from "@/lib/phone";
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
<<<<<<< HEAD
    const { phone } = await req.json();
    if (!phone || !/^\d{8,15}$/.test(phone)) {
      return NextResponse.json({ error: "Numero invalido" }, { status: 400 });
=======
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await req.json();
    const phone = normalizeAuthPhone(String(body?.phone ?? ""));
    if (!phone || !isValidAuthPhone(phone)) {
      return NextResponse.json(
        { error: "Número inválido (México: 10 dígitos; EE.UU.: 10 dígitos con código +1)" },
        { status: 400 }
      );
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)
    }

    const h = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
<<<<<<< HEAD
    const countRes = await fetch(
      `${SUPA_URL}/rest/v1/otp_codes?phone=eq.${phone}&created_at=gte.${oneHourAgo}&select=id`,
      { headers: h }
    );
    const countRows = countRes.ok ? await countRes.json() : [];
    if (countRows.length >= 5) {
=======
    const { count, error: rateLimitError } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);
    if (rateLimitError) throw new Error("No se pudo validar intentos OTP");
    if ((count ?? 0) >= 5) {
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)
      return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
    }

    const code = generateOTP();
<<<<<<< HEAD
    await fetch(`${SUPA_URL}/rest/v1/otp_codes`, {
      method: "POST",
      headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ phone, code, expires_at: new Date(Date.now() + 90 * 1000).toISOString() }),
=======
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone, code, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)
    });
    if (insertError) throw new Error("No se pudo guardar el código OTP");

    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
    if (sid && token && from) {
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: `whatsapp:+${phone}`,
<<<<<<< HEAD
          Body: `Tu codigo de Naranjogo es: *${code}*
Valido 90 segundos.`,
=======
          Body: `Tu código de Tianguis es: *${code}*\nVálido 5 minutos. No lo compartas.`,
>>>>>>> 7ea8605 (Fix OTP send/verify reliability and phone normalization)
        }),
      });
      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        throw new Error(`Error de envío WhatsApp: ${twilioRes.status} ${errText}`);
      }
    } else {
      console.log(`[DEV OTP] +${phone} -> ${code}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
