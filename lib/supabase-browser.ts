"use client";
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

function readPublicSupabaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!u) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local and restart the dev server.");
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid");
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (https://….supabase.co), not an API key. Fix .env.local and restart npm run dev.",
    );
  }
  return u;
}

export function createSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient(readPublicSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
