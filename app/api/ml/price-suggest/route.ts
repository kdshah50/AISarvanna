import { NextRequest, NextResponse } from "next/server";

function internalApiSecret(): string {
  const raw = process.env.INTERNAL_API_SECRET;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  // Empty env on Vercel must not send "" — FastAPI would get 403 vs a non-empty Railway secret.
  return trimmed || "tianguis_secret_2026";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fastapiUrl = process.env.FASTAPI_INTERNAL_URL?.trim() || "https://naranjogo3-production.up.railway.app";

    const res = await fetch(`${fastapiUrl}/ml/price-suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalApiSecret(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ML unavailable" }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
