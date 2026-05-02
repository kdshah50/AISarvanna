import { NextResponse } from "next/server";
import { getServiceRoleRestHeaders, getSupabaseUrl } from "@/lib/service-rest";

/**
 * DEV ONLY — POST /REST listing counts via Supabase (same env as app).
 * Open: http://localhost:3006/api/dev/listings-sanity
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalFromHeaders = (h: Headers): number | null => {
    const s = h.get("content-range");
    if (!s?.includes("/")) return null;
    const part = s.split("/")[1];
    if (!part || part === "*") return null;
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : null;
  };

  try {
    const base = getSupabaseUrl();
    const headers = {
      ...getServiceRoleRestHeaders(),
      Prefer: "count=exact",
    };

    async function countFor(query: string): Promise<number | null> {
      const url = `${base}/rest/v1/listings?${query}&select=id`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        await res.text().catch(() => "");
        return null;
      }
      return totalFromHeaders(res.headers);
    }

    const activeVerified =
      (await countFor("status=eq.active&is_verified=eq.true")) ?? NaN;
    const activePending =
      (await countFor("status=eq.active&is_verified=eq.false")) ?? NaN;

    let beautyMiddlesexApprox: number | null = null;
    const beautyRes = await fetch(
      `${base}/rest/v1/listings?status=eq.active&is_verified=eq.true&category_id=eq.beauty&select=id,location_lat,location_lng`,
      { headers: { ...getServiceRoleRestHeaders() }, cache: "no-store" }
    );
    if (beautyRes.ok) {
      const rows = (await beautyRes.json()) as { location_lat?: number; location_lng?: number }[];
      const mLat = 40.44,
        mLng = -74.4,
        R = 6371,
        d2r = Math.PI / 180;
      const km = (a: number, b: number, c: number, d: number) => {
        const x =
          Math.sin(((c - a) * d2r) / 2) ** 2 +
          Math.cos(a * d2r) * Math.cos(c * d2r) * Math.sin(((d - b) * d2r) / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      };
      beautyMiddlesexApprox = rows.filter(
        (r) =>
          typeof r.location_lat === "number" &&
          typeof r.location_lng === "number" &&
          km(mLat, mLng, r.location_lat, r.location_lng) <= 72
      ).length;
    }

    return NextResponse.json({
      supabaseUrlHost: (() => {
        try {
          return new URL(base).host;
        } catch {
          return "(invalid URL)";
        }
      })(),
      counts: {
        activeVerified: Number.isFinite(activeVerified) ? activeVerified : "error",
        activePending: Number.isFinite(activePending) ? activePending : "error",
        beautyInMiddlesex72km:
          beautyMiddlesexApprox !== null ? beautyMiddlesexApprox : "error",
      },
      hints: [
        "If activeVerified is 0, run supabase/seed-demo-service-listings.sql in the SQL Editor (same project as this URL).",
        "Pending tab is empty when activePending is 0 — seed uses is_verified=true, so no approval queue.",
        "If beautyInMiddlesex72km is 0 but activeVerified > 0, county filter may exclude rows (or no beauty listings with lat/lng).",
      ],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, hint: "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local" },
      { status: 500 }
    );
  }
}
