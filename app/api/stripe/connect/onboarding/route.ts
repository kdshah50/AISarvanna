import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest, idMatchVariantsForIn } from "@/lib/auth-server";
import { getPublicAppUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const APP_URL = getPublicAppUrl();

/**
 * POST { email?: string } — create or resume Stripe Connect Express onboarding for the current user (seller).
 * Email is required the first time (Stripe).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";

    const supabase = createAdminSupabase();
    const idVars = idMatchVariantsForIn(userId);
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("id,stripe_connect_account_id,display_name,phone")
      .in("id", idVars)
      .maybeSingle();

    if (uErr || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const stripe = getStripe();
    let accountId = user.stripe_connect_account_id as string | null;

    if (!accountId || !accountId.startsWith("acct_")) {
      const email = emailRaw || null;
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "Necesitamos un correo para Stripe (p. ej. el de tu negocio)." },
          { status: 400 }
        );
      }

      const account = await stripe.accounts.create({
        type: "express",
        country: "MX",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { naranjogo_user_id: user.id as string },
      });

      accountId = account.id;

      const { error: upErr } = await supabase
        .from("users")
        .update({ stripe_connect_account_id: accountId })
        .in("id", idVars);

      if (upErr) {
        console.error("[stripe/connect] save account id", upErr);
        return NextResponse.json({ error: "No se pudo guardar la cuenta Stripe" }, { status: 500 });
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/profile?stripe_connect=refresh`,
      return_url: `${APP_URL}/profile?stripe_connect=done`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (e: unknown) {
    console.error("[stripe/connect/onboarding]", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
