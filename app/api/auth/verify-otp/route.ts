import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { isValidAuthPhone, normalizeAuthPhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await req.json();
    const phone = normalizeAuthPhone(String(body?.phone ?? ""));
    const code = String(body?.code ?? "").replace(/\D/g, "").slice(0, 6);

    if (!isValidAuthPhone(phone) || code.length !== 6) {
      return NextResponse.json({ error: "Datos de verificación inválidos" }, { status: 400 });
    }

    const { data: otp, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError && otpError.code !== "PGRST116") {
      throw new Error("No se pudo validar el código OTP");
    }
    if (!otp) {
      return NextResponse.json({ error: "Código incorrecto o expirado" }, { status: 401 });
    }

    const { error: markUsedError } = await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);
    if (markUsedError) throw new Error("No se pudo actualizar el OTP");

    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert({ phone, phone_verified: true, trust_badge: "bronze" }, { onConflict: "phone" })
      .select("id, display_name, trust_badge")
      .single();
    if (userError || !user) throw new Error("No se pudo crear/actualizar usuario");

    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "tianguis_dev_secret_change_in_production");
    const token = await new SignJWT({ sub: user.id, phone, badge: user.trust_badge })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({ token, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
