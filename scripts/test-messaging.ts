/**
 * Integration checks for in-app messaging APIs.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET (same as Next),
 * and a running app (default http://127.0.0.1:3000).
 *
 * Run: npm run test:messaging
 * Or: MESSAGING_TEST_BASE_URL=https://... npm run test:messaging
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadDotenv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

async function jwtFor(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "tianguis_dev_secret_change_in_production"
  );
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

const FETCH_MS = 12_000;

async function fetchJson(
  base: string,
  path: string,
  opts: RequestInit & { cookieJwt?: string } = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { cookieJwt, ...init } = opts;
  const headers = new Headers(init.headers);
  if (cookieJwt) headers.set("Cookie", `tianguis_token=${cookieJwt}`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** When PORT is not 3000, Next picks a free port — probe until Tianguis inbox 401 matches. */
async function discoverDevBase(explicit: string | undefined): Promise<string> {
  if (explicit) return explicit.replace(/\/$/, "");
  const ports = [3000, 3001, 3002, 3003, 3004, 3005];
  for (const port of ports) {
    const base = `http://127.0.0.1:${port}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${base}/api/conversations/inbox`, {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status !== 401) continue;
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      const err = data?.error ?? "";
      if (typeof err === "string" && err.includes("autenticado")) return base;
    } catch {
      /* try next port */
    }
  }
  return "http://127.0.0.1:3000";
}

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

async function smokeOnly(base: string) {
  console.log(`Messaging tests → ${base}`);
  const noCookie = await fetchJson(base, "/api/conversations/inbox");
  if (noCookie.status !== 401)
    fail(`Smoke: inbox without cookie expected 401, got ${noCookie.status}`);

  const badCookie = await fetchJson(base, "/api/conversations/inbox", {
    headers: { Cookie: "tianguis_token=not-a-jwt" },
  });
  if (badCookie.status !== 401)
    fail(`Smoke: inbox with bad token expected 401, got ${badCookie.status}`);

  const noListing = await fetchJson(base, "/api/conversations", {
    headers: { Cookie: `tianguis_token=${await jwtFor("smoke-user")}` },
  });
  if (noListing.status !== 400)
    fail(`Smoke: GET /api/conversations without listingId expected 400, got ${noListing.status}`);

  console.log("OK — messaging smoke (auth gates + validation) passed.");
}

async function main() {
  loadDotenv();
  const base = await discoverDevBase(
    process.env.MESSAGING_TEST_BASE_URL?.replace(/\/$/, "")
  );

  const smoke = process.argv.includes("--smoke");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (smoke) {
      await smokeOnly(base);
      return;
    }
    fail(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --smoke for auth-only checks, or add .env.local."
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Messaging tests → ${base}`);

  let { data: rows } = await supabase
    .from("listings")
    .select("id,seller_id")
    .eq("status", "active")
    .not("seller_id", "is", null)
    .limit(5);

  if (!rows?.length) {
    const alt = await supabase
      .from("listings")
      .select("id,seller_id")
      .not("seller_id", "is", null)
      .limit(5);
    rows = alt.data ?? [];
  }

  if (!rows?.length) fail("No listing with seller_id in DB — seed a listing first.");

  const listing = rows.find((r) => r.seller_id && String(r.seller_id).length > 0);
  if (!listing?.seller_id) fail("Could not pick a listing with seller_id");

  const listingId = listing.id as string;
  const sellerId = listing.seller_id as string;
  const buyerId = `msg-test-buyer-${Date.now()}`;

  if (sellerId === buyerId) fail("Unexpected seller/buyer clash");

  const buyerToken = await jwtFor(buyerId);
  const sellerToken = await jwtFor(sellerId);
  const strangerToken = await jwtFor(`msg-test-stranger-${Date.now()}`);

  // Health: server up (inbox without cookie → 401)
  try {
    const ping = await fetchJson(base, "/api/conversations/inbox");
    if (ping.status !== 401)
      fail(`Unexpected inbox status ${ping.status} — wrong server on ${base}?`);
  } catch {
    fail(`Cannot reach ${base} — start Next (npm run dev) or set MESSAGING_TEST_BASE_URL`);
  }

  // POST create conversation (buyer)
  const postConv = await fetchJson(base, "/api/conversations", {
    method: "POST",
    cookieJwt: buyerToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  });
  if (!postConv.ok)
    fail(`POST /api/conversations: ${postConv.status} ${JSON.stringify(postConv.data)}`);
  const conversationId = (postConv.data as { conversationId?: string }).conversationId;
  if (!conversationId) fail("No conversationId in POST response");

  // GET thread (buyer)
  const getThread = await fetchJson(base, `/api/conversations/${conversationId}`, {
    cookieJwt: buyerToken,
  });
  if (!getThread.ok)
    fail(`GET /api/conversations/[id] buyer: ${getThread.status} ${JSON.stringify(getThread.data)}`);

  // POST message (buyer)
  const bodyText = `test message ${Date.now()}`;
  const postMsg = await fetchJson(base, `/api/conversations/${conversationId}/messages`, {
    method: "POST",
    cookieJwt: buyerToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: bodyText }),
  });
  if (!postMsg.ok)
    fail(`POST messages: ${postMsg.status} ${JSON.stringify(postMsg.data)}`);
  const msg = (postMsg.data as { message?: { body?: string } }).message;
  if (msg?.body !== bodyText) fail("Returned message body mismatch");

  // GET thread (seller)
  const getSeller = await fetchJson(base, `/api/conversations/${conversationId}`, {
    cookieJwt: sellerToken,
  });
  if (!getSeller.ok)
    fail(`GET thread as seller: ${getSeller.status} ${JSON.stringify(getSeller.data)}`);

  // Stranger must not read
  const get403 = await fetchJson(base, `/api/conversations/${conversationId}`, {
    cookieJwt: strangerToken,
  });
  if (get403.status !== 403) fail(`Expected 403 for non-participant, got ${get403.status}`);

  // Inbox (buyer) contains thread
  const inbox = await fetchJson(base, "/api/conversations/inbox", { cookieJwt: buyerToken });
  if (!inbox.ok) fail(`GET inbox: ${inbox.status} ${JSON.stringify(inbox.data)}`);
  const threads = (inbox.data as { threads?: { conversationId: string }[] }).threads ?? [];
  if (!threads.some((t) => t.conversationId === conversationId))
    fail("Inbox missing new conversation");

  // GET listing scope (buyer)
  const scope = await fetchJson(base, `/api/conversations?listingId=${encodeURIComponent(listingId)}`, {
    cookieJwt: buyerToken,
  });
  if (!scope.ok) fail(`GET ?listingId= buyer: ${scope.status} ${JSON.stringify(scope.data)}`);

  // Cleanup
  await supabase.from("listing_messages").delete().eq("conversation_id", conversationId);
  await supabase.from("listing_conversations").delete().eq("id", conversationId);

  console.log("OK — messaging API checks passed:");
  console.log(`  listing=${listingId} conversation=${conversationId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
