import { NextRequest, NextResponse } from "next/server";
import { normalizeUsZip5 } from "@/lib/us-zip";
import { geocodeUsZip } from "@/lib/geocode-us-zip";

/** GET `/api/geo/zip?zip=08854` — US ZIP centroid (client + admin tools; rate-limit at edge in prod). */
export async function GET(req: NextRequest) {
  const z = normalizeUsZip5(req.nextUrl.searchParams.get("zip") ?? req.nextUrl.searchParams.get("code"));
  if (!z) return NextResponse.json({ error: "missing_or_invalid_zip" }, { status: 400 });

  const hit = await geocodeUsZip(z);
  if (!hit) return NextResponse.json({ error: "unknown_zip" }, { status: 404 });

  return NextResponse.json({ zip: z, lat: hit.lat, lng: hit.lng, place: hit.place ?? null });
}
