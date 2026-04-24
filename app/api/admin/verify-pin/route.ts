import { NextRequest, NextResponse } from "next/server";
import { getAdminPin, isAdminPinConfigured } from "@/lib/admin-pin";

export const dynamic = "force-dynamic";

/** Validates PIN on the server so the /admin gate matches Vercel env without client bundle bake-in. */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminPinConfigured()) {
      return NextResponse.json(
        { error: "Define ADMIN_PIN en el servidor" },
        { status: 503 }
      );
    }
    const body = await req.json();
    const pin = String(body?.pin ?? "").trim();
    if (!pin || pin !== getAdminPin()) {
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
}
