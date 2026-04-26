import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/auth-server";
import { computeCartPricing, resolveCartLines, type CartItemPayload } from "@/lib/marketplace-cart-server";
import { marketplaceConnectRequired } from "@/lib/marketplace-stripe-mode";

export const dynamic = "force-dynamic";

/** POST { items: { listingId, qty }[] } — pricing breakdown for goods cart (tax + commission). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const items = body?.items as CartItemPayload[] | undefined;
    const supabase = createAdminSupabase();
    const resolved = await resolveCartLines(supabase, items ?? []);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const pricing = computeCartPricing(resolved.lines);
    const connectRequired = marketplaceConnectRequired();
    return NextResponse.json({
      sellerId: resolved.sellerId,
      stripeMode: connectRequired ? "connect" : "platform",
      connectRequired,
      ...pricing,
      applicationFeeCents: pricing.commissionCents + pricing.vatCents,
    });
  } catch (e: unknown) {
    console.error("[cart/preview]", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
