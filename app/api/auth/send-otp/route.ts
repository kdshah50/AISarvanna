import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canonicalizeAuthPhone, isValidAuthPhone, normalizeAuthPhone } from "@/lib/phone";

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
  const payload = {
    phone,
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
    status: err?.status,
    raw: typeof err === "object" ? JSON.stringify(err) : String(err),
  };
  console.error(`[send-otp] ${step}`, payload);
}

function newRequestId(req: NextRequest) {
  return req.headers.get("x-vercel-id") ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId(req);
  let step: "validate" | "rate_limit" | "insert" | "twilio" | "done" = "validate";
  try {
    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
    const body = await req.json();
    let phone = normalizeAuthPhone(String(body?.phone ?? ""));
    phone = canonicalizeAuthPhone(phone);
    if (!phone || !isValidAuthPhone(phone)) {
      return NextResponse.json(
        {
          error: "Número inválido (México: 10 dígitos; EE.UU.: 10 dígitos con código +1)",
          requestId,
        },
        { status: 400 }
      );
    }

    step = "rate_limit";
    const rateLimitWindow = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const maxOtpsPerWindow = 10;
    const { data: recentOtps, error: rateLimitError } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", rateLimitWindow)
      .order("created_at", { ascending: false })
      .limit(maxOtpsPerWindow);
    if (rateLimitError) {
      logSupabaseError("rate-limit-query-failed", phone, rateLimitError);
      return NextResponse.json(
        {
          error: "No se pudo enviar el código OTP",
          requestId,
          step: "rate_limit",
        },
        { status: 500 }
      );
    }
    if ((recentOtps?.length ?? 0) >= maxOtpsPerWindow) {
      return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos.", requestId }, { status: 429 });
    }

    step = "insert";
    const code = generateOTP();
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      logSupabaseError("otp-insert-failed", phone, insertError);
      return NextResponse.json(
        {
          error: "No se pudo enviar el código OTP",
          requestId,
          step: "insert",
        },
        { status: 500 }
      );
    }

    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
    if (sid && token && from) {
      step = "twilio";
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
        console.error("[send-otp] twilio-failed", { requestId, phone, status: twilioRes.status, errText });
        return NextResponse.json(
          {
            error: "No se pudo enviar el código OTP",
            requestId,
            step: "twilio",
          },
          { status: 500 }
        );
      }
    } else {
      console.log(`[DEV OTP] +${phone} -> ${code}`);
    }

    step = "done";
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, devOtp: code, requestId });
    }
    return NextResponse.json({ ok: true, requestId });
  } catch (e: any) {
    console.error("[send-otp] unhandled error", { requestId, step, message: e?.message, stack: e?.stack });
    const msg = process.env.NODE_ENV === "production" ? "No se pudo enviar el código OTP" : e?.message;
    return NextResponse.json({ error: msg, requestId, step }, { status: 500 });
  }
}
