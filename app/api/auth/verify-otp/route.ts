import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://erfsvaddrspmlavvulne.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZnN2YWRkcnNwbWxhdnZ1bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODgwNDUsImV4cCI6MjA4OTc2NDA0NX0.TeroMLcgJm2zKqYEPYP9PaIw4DCk79d7fPZqsERGu20";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    const h = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

    const otpRes = await fetch(
      `${SUPA_URL}/rest/v1/otp_codes?phone=eq.${phone}&code=eq.${code}&used=eq.false&expires_at=gte.${new Date().toISOString()}&order=created_at.desc&limit=1`,
      { headers: h }
    );
    const otpRows = otpRes.ok ? await otpRes.json() : [];
    const otp = otpRows[0];
    if (!otp) return NextResponse.json({ error: "Codigo incorrecto o expirado" }, { status: 401 });

    await fetch(`${SUPA_URL}/rest/v1/otp_codes?id=eq.${otp.id}`, {
      method: "PATCH", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ used: true }),
    });

    const userRes = await fetch(`${SUPA_URL}/rest/v1/users`, {
      method: "POST",
      headers: { ...h, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ phone, phone_verified: true, trust_badge: "bronze" }),
    });
    const userRows = userRes.ok ? await userRes.json() : [];
    const user = userRows[0];
    if (!user) throw new Error("Error al crear usuario");

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
