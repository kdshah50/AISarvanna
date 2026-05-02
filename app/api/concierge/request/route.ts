import { NextRequest, NextResponse } from "next/server";
import { parseSearchQuery } from "@/lib/search-query-parse";

function parseBodyCategory(body: Record<string, unknown>): string {
  const c = body.category ?? body.cat;
  return typeof c === "string" && c.trim() ? c.trim().toLowerCase() : "services";
}

/** Stub “book path”: returns parsed `ConciergeRequest` + parity with search parse (until calendars / checkout). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "services").trim().toLowerCase() || "services";
  const parsed = q ? await parseSearchQuery(q, category) : null;
  const concierge = parsed?.concierge ?? null;

  return NextResponse.json({
    stub: true,
    next: ["POST listing + slot selection", "Stripe / escrow", "seller calendar sync"],
    q,
    category,
    searchHint: parsed
      ? {
          keywordForSparse: parsed.keywordForSparse,
          textForEmbedding: parsed.textForEmbedding,
          searchCategoryHint: parsed.searchCategoryHint ?? null,
        }
      : null,
    concierge,
    budgetMaxCents: parsed?.maxPriceCents ?? null,
    budgetMinCents: parsed?.minPriceCents ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const q =
      typeof body.q === "string"
        ? body.q.trim()
        : typeof body.query === "string"
          ? body.query.trim()
          : "";
    const category = parseBodyCategory(body);

    const parsed = q ? await parseSearchQuery(q, category) : null;
    const concierge = parsed?.concierge ?? null;

    return NextResponse.json({
      stub: true,
      next: ["POST listing + slot selection", "Stripe / escrow", "seller calendar sync"],
      q,
      category,
      searchHint: parsed
        ? {
            keywordForSparse: parsed.keywordForSparse,
            textForEmbedding: parsed.textForEmbedding,
            searchCategoryHint: parsed.searchCategoryHint ?? null,
          }
        : null,
      concierge,
      budgetMaxCents: parsed?.maxPriceCents ?? null,
      budgetMinCents: parsed?.minPriceCents ?? null,
    });
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
}
