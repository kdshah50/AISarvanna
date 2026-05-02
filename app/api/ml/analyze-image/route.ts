import { NextRequest, NextResponse } from "next/server";

function internalApiSecret(): string {
  const raw = process.env.INTERNAL_API_SECRET;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed || "tianguis_secret_2026";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const photoUrl = typeof body?.photo_url === "string" ? body.photo_url.trim() : "";
    if (!photoUrl) {
      return NextResponse.json({ error: "photo_url required" }, { status: 400 });
    }

    const fastapiUrl =
      process.env.FASTAPI_INTERNAL_URL?.trim() || "https://naranjogo3-production.up.railway.app";

    const listingId =
      typeof body?.listing_id === "string" && body.listing_id.trim()
        ? body.listing_id.trim()
        : undefined;

    const res = await fetch(`${fastapiUrl}/ml/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalApiSecret(),
      },
      body: JSON.stringify({
        photo_url: photoUrl,
        ...(listingId ? { listing_id: listingId } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[analyze-image]", res.status, text);
      return NextResponse.json({ error: "Analyze unavailable" }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
