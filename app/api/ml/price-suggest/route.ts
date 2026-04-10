import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fastapiUrl = process.env.FASTAPI_INTERNAL_URL ?? "https://naranjogo3-production.up.railway.app";

    const res = await fetch(`${fastapiUrl}/ml/price-suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "tianguis_secret_2026",
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
