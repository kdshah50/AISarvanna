import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleRestHeaders, getSupabaseUrl } from "@/lib/service-rest";

const hJson = () => ({ ...getServiceRoleRestHeaders(), "Content-Type": "application/json" as const });

// GET /api/listings/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/listings?id=eq.${params.id}&select=*,users!fk_listings_seller(display_name,avatar_url,trust_badge,ine_verified,created_at)`,
      { headers: hJson(), cache: "no-store" }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/listings/[id] — update listing (admin or owner via service key)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/listings?id=eq.${params.id}`,
      {
        method: "PATCH",
        headers: { ...hJson(), Prefer: "return=representation" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/listings/[id] — soft delete (archived)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/listings?id=eq.${params.id}`,
      {
        method: "PATCH",
        headers: { ...hJson(), Prefer: "return=representation" },
        body: JSON.stringify({ status: "archived" }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
