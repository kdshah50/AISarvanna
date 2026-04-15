import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidAuthPhone, normalizeAuthPhone } from "@/lib/phone";

function generateOTP() {
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
}

function asWhatsappAddress(value: string) {
  const v = value.trim();
  if (!v) return v;
  if (v.startsWith("whatsapp:")) return v;
  const cleaned = v.replace(/^whatsapp:/, "");
  return `whatsapp:${cleaned.startsWith("+") ? cleaned : `+${cleaned}`}`;
}

function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function logSupabaseError(step: string, phone: string, err: any) {
  console.error(`[send-otp] ${step}`, {
    phone,
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
    const body = await req.json();
    const phone = normalizeAuthPhone(String(body?.phone ?? ""));
    if (!phone || !isValidAuthPhone(phone)) {
      return NextResponse.json(
        { error: "Número inválido (México: 10 dígitos; EE.UU.: 10 dígitos con código +1)" },
        { status: 400 }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);
    if (rateLimitError) {
      logSupabaseError("rate-limit-query-failed", phone, rateLimitError);
      throw new Error("No se pudo validar intentos OTP");
    }
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
    }

    const code = generateOTP();
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      logSupabaseError("otp-insert-failed", phone, insertError);
      throw new Error("No se pudo guardar el código OTP");
    }

    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
    if (sid && token && from) {
      const fromAddress = asWhatsappAddress(from);
      const toAddress = asWhatsappAddress(phone);
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromAddress,
          To: toAddress,
          Body: `Tu código de Naranjogo es: *${code}*\nVálido 5 minutos. No lo compartas.`,
        }),
      });
      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        throw new Error(`Error de envío WhatsApp: ${twilioRes.status} ${errText}`);
      }
    } else {
      console.log(`[DEV OTP] +${phone} -> ${code}`);
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, devOtp: code });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[send-otp] unhandled error", { message: e?.message, stack: e?.stack });
    const msg = process.env.NODE_ENV === "production" ? "No se pudo enviar el código OTP" : e?.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
