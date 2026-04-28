import "server-only";

/**
 * PostgREST headers for server-side calls that must bypass RLS.
 * The anon key must not be used for table access after RLS is enabled (no public policies).
 */
export function getSupabaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!u) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid");
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be your project URL (e.g. https://abcdxyzcompany.supabase.co or http://127.0.0.1:54321), not an API key. Copy it from Supabase → Project Settings → API → Project URL.",
    );
  }
  return u;
}

export function getServiceRoleRestHeaders(): { apikey: string; Authorization: string } {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required (RLS: tables are closed to the anon key).");
  }
  return { apikey: k, Authorization: `Bearer ${k}` };
}

export function getServiceOrAnonRestHeaders(): { apikey: string; Authorization: string } {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!k) {
    throw new Error("Set SUPABASE_SERVICE_ROLE_KEY in production, or anon for local dev only.");
  }
  return { apikey: k, Authorization: `Bearer ${k}` };
}
