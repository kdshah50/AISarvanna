import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { getStripe } from "@/lib/stripe";
import { reconcileOneCheckoutSession } from "@/lib/reconcile-pending-payments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = 25;
/** Reconcile only recent rows so we do not scan the full history every run. */
const MAX_AGE_DAYS = 14;

/**
 * Vercel Cron: GET with Authorization: Bearer ${CRON_SECRET}
 * Picks pending service_bookings that already have a Stripe Checkout session, checks
 * Stripe for payment, and flips the row to paid if the session is paid (same logic as
 * webhook, plus loyalty when this path is the one that first marks paid).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminSupabase();
  const stripe = getStripe();

  const { data: rows, error: qErr } = await supabase
    .from("service_bookings")
    .select("id, stripe_checkout_session_id, buyer_id")
    .eq("payment_status", "pending")
    .not("stripe_checkout_session_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(LIMIT);

  if (qErr) {
    console.error("[cron/reconcile-payments] query", qErr);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows ?? []) {
    if (!row.stripe_checkout_session_id) continue;
    const r = await reconcileOneCheckoutSession(supabase, stripe, {
      id: String(row.id),
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      buyer_id: String(row.buyer_id),
    });
    if (r === "synced") synced += 1;
    else if (r === "skipped") skipped += 1;
    else errors += 1;
  }

  return NextResponse.json(
    { ok: true, examined: (rows ?? []).length, synced, skipped, errors, maxAgeDays: MAX_AGE_DAYS },
    { headers: { "Cache-Control": "no-store" } }
  );
}
