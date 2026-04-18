import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";
import { getAdminPin } from "@/lib/admin-pin";

export const dynamic = "force-dynamic";

const VALID_REASONS = ["fraud", "fake_listing", "misleading", "inappropriate", "spam", "other"] as const;

/** GET ?pin=… — admin lists all reports */
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");
  if (!pin || pin !== getAdminPin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const status = req.nextUrl.searchParams.get("status") ?? "open";

  const query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[reports] GET error:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }

  const listingIds = [...new Set((data ?? []).map((r) => r.listing_id).filter(Boolean))];
  let listingMap: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id,title_es")
      .in("id", listingIds);
    for (const l of listings ?? []) listingMap[l.id] = l.title_es;
  }

  const userIds = [...new Set((data ?? []).flatMap((r) => [r.reporter_id, r.seller_id].filter(Boolean)))];
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id,display_name,phone")
      .in("id", userIds);
    for (const u of users ?? []) userMap[u.id] = u.display_name || u.phone || u.id.slice(0, 8);
  }

  const enriched = (data ?? []).map((r) => ({
    ...r,
    listing_title: r.listing_id ? (listingMap[r.listing_id] ?? "Unknown") : null,
    reporter_name: userMap[r.reporter_id] ?? r.reporter_id?.slice(0, 8),
    seller_name: r.seller_id ? (userMap[r.seller_id] ?? r.seller_id?.slice(0, 8)) : null,
  }));

  return NextResponse.json({ reports: enriched });
}

/** POST { listingId?, sellerId?, reason, details? } — user submits report */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const listingId = body?.listingId ? String(body.listingId).trim() : null;
    const sellerId = body?.sellerId ? String(body.sellerId).trim() : null;
    const reason = String(body?.reason ?? "").trim();
    const details = body?.details ? String(body.details).trim().slice(0, 2000) : null;

    if (!listingId && !sellerId) {
      return NextResponse.json({ error: "listingId or sellerId required" }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason as any)) {
      return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(", ")}` }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", userId)
      .eq("status", "open");

    const openByUser = (existing ?? []).filter((r) =>
      listingId ? false : true
    );

    if (listingId) {
      const { data: dup } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", userId)
        .eq("listing_id", listingId)
        .eq("status", "open")
        .maybeSingle();
      if (dup) {
        return NextResponse.json({ error: "Ya reportaste este anuncio" }, { status: 409 });
      }
    }

    const { data: report, error: insertErr } = await supabase
      .from("reports")
      .insert({
        reporter_id: userId,
        listing_id: listingId,
        seller_id: sellerId,
        reason,
        details,
      })
      .select("id,reason,status,created_at")
      .single();

    if (insertErr) {
      console.error("[reports] POST insert error:", insertErr);
      return NextResponse.json({ error: "Error al enviar el reporte" }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (e: unknown) {
    console.error("[reports] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH { reportId, status, admin_note? } — admin updates report */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "").trim();
    if (!pin || pin !== getAdminPin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = String(body?.reportId ?? "").trim();
    const status = String(body?.status ?? "").trim();
    const adminNote = body?.admin_note ? String(body.admin_note).trim() : undefined;

    if (!reportId) {
      return NextResponse.json({ error: "reportId required" }, { status: 400 });
    }

    const validStatuses = ["open", "reviewed", "action_taken", "dismissed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const updates: Record<string, unknown> = { status };
    if (adminNote !== undefined) updates.admin_note = adminNote;
    if (status !== "open") updates.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", reportId)
      .select("id,status,admin_note,resolved_at")
      .maybeSingle();

    if (error) {
      console.error("[reports] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, report: data });
  } catch (e: unknown) {
    console.error("[reports] PATCH error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
