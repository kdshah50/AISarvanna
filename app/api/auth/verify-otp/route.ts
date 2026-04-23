import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { canonicalizeAuthPhone, isValidAuthPhone, normalizeAuthPhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await req.json();
    let phone = normalizeAuthPhone(String(body?.phone ?? ""));
    phone = canonicalizeAuthPhone(phone);
    const code = String(body?.code ?? "").replace(/\D/g, "").slice(0, 6);
    const referralCodeRaw = String(body?.referralCode ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(0, 12);

    if (!isValidAuthPhone(phone) || code.length !== 6) {
      return NextResponse.json({ error: "Datos de verificación inválidos" }, { status: 400 });
    }

    const baseOtpQuery = () =>
      supabase
        .from("otp_codes")
        .select("*")
        .eq("phone", phone)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

    let { data: otp, error: otpError } = await baseOtpQuery().eq("code", code).maybeSingle();

    // Some DBs store OTP as integer; retry with numeric code to avoid type mismatch failures.
    if (otpError) {
      const numericCode = Number(code);
      if (Number.isInteger(numericCode)) {
        const retry = await baseOtpQuery().eq("code", numericCode).maybeSingle();
        otp = retry.data;
        otpError = retry.error;
      }
    }

    if (otpError) {
      console.error("[verify-otp] lookup error", otpError);
      throw new Error("No se pudo validar el código OTP");
    }
    if (!otp) {
      return NextResponse.json({ error: "Código incorrecto o expirado" }, { status: 401 });
    }

    const { error: markUsedError } = await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);
    if (markUsedError) throw new Error("No se pudo actualizar el OTP");

    // Check for duplicate accounts with +prefix variant (e.g. "+17326908527" vs "17326908527")
    const plusVariant = `+${phone}`;
    const { data: dupUser } = await supabase
      .from("users")
      .select("id,phone")
      .eq("phone", plusVariant)
      .maybeSingle();
    if (dupUser) {
      await supabase.from("users").update({ phone }).eq("id", dupUser.id);
      console.log("[verify-otp] merged +prefix duplicate", { id: dupUser.id, old: plusVariant, new: phone });
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, display_name, trust_badge")
      .eq("phone", phone)
      .maybeSingle();

    let user: { id: string; display_name: string | null; trust_badge: string } | null = null;

    if (existingUser) {
      const { error: upErr } = await supabase
        .from("users")
        .update({ phone_verified: true })
        .eq("id", existingUser.id);
      if (upErr) throw new Error("No se pudo actualizar usuario");
      user = existingUser;
    } else {
      let referredBy: string | null = null;
      if (referralCodeRaw.length >= 4) {
        const { data: rc } = await supabase
          .from("referral_codes")
          .select("user_id")
          .eq("code", referralCodeRaw)
          .maybeSingle();
        if (rc?.user_id) referredBy = rc.user_id;
      }
      const { data: inserted, error: insErr } = await supabase
        .from("users")
        .insert({ phone, phone_verified: true, trust_badge: "bronze", referred_by: referredBy })
        .select("id, display_name, trust_badge")
        .single();
      if (insErr || !inserted) throw new Error("No se pudo crear/actualizar usuario");
      user = inserted;
    }
    if (!user) throw new Error("No se pudo crear/actualizar usuario");

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
