import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { phone, code } = await req.json();

    const { data: otp } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otp) {
      return NextResponse.json({ error: "Código incorrecto o expirado" }, { status: 401 });
    }

    await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);

    const { data: user } = await supabase
      .from("users")
      .upsert({ phone, phone_verified: true, trust_badge: "bronze" }, { onConflict: "phone" })
      .select("id, display_name, trust_badge")
      .single();

    if (!user) throw new Error("Error al crear usuario");

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? "tianguis_dev_secret_change_in_production"
    );
    const token = await new SignJWT({ sub: user.id, phone, badge: user.trust_badge })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({ token, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
