import type { SupabaseClient } from "@supabase/supabase-js";

/** Bucket should be private in Supabase Dashboard → Storage (signed URLs used for display). */
const BUCKET = "ine-photos";

/** Legacy rows store a full https://... URL; new rows store the object name only (private bucket + signed reads). */
export function isPublicInePhotoUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

/** Signed URL for display (short TTL — refresh by refetching /api/auth/me). */
export async function signedInePhotoUrl(
  supabase: SupabaseClient,
  objectPathOrLegacyUrl: string | null | undefined
): Promise<string | null> {
  if (!objectPathOrLegacyUrl) return null;
  if (isPublicInePhotoUrl(objectPathOrLegacyUrl)) {
    return objectPathOrLegacyUrl;
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPathOrLegacyUrl, 3600);
  if (error || !data?.signedUrl) {
    console.error("[ine-storage] signed url", error);
    return null;
  }
  return data.signedUrl;
}

export { BUCKET as INE_PHOTOS_BUCKET };
