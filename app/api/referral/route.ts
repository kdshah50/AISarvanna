import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";
import { ensureReferralCode, REFERRAL_BONUS_POINTS } from "@/lib/referral";

export const dynamic = "force-dynamic";

/**
 * GET — returns shareable code and full referral link for the current user.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createAdminSupabase();
  let code: string;
  try {
    code = await ensureReferralCode(supabase, userId);
  } catch (e) {
    console.error("[referral] ensureReferralCode", e);
    return NextResponse.json({ error: "No se pudo generar el código" }, { status: 500 });
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (req.headers.get("x-forwarded-proto")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
      : "") ||
    "https://aisaravanna.com";

  const link = `${site}/auth/login?ref=${encodeURIComponent(code)}`;

  return NextResponse.json({
    code,
    link,
    bonusPoints: REFERRAL_BONUS_POINTS,
  });
}
