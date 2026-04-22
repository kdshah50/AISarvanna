import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

export const TIANGUIS_TOKEN_COOKIE = "tianguis_token";

export function getJwtSecretBytes() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "tianguis_dev_secret_change_in_production");
}

/** JWT sub vs Supabase uuids may differ in letter casing; never use raw `===` for identity. */
export function isSameUserId(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a == null || b == null) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** For PostgREST `.in()` on TEXT uuid columns — `.eq` is case-sensitive vs normalized JWT sub. */
export function idMatchVariantsForIn(id: string): string[] {
  const t = id.trim();
  if (!t) return [];
  return Array.from(new Set([t, t.toLowerCase(), t.toUpperCase()]));
}

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(TIANGUIS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) return null;
    return sub.trim().toLowerCase();
  } catch {
    return null;
  }
}

export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
