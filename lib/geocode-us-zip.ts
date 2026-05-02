import { normalizeUsZip5 } from "@/lib/us-zip";

type ZippoResponse = {
  places?: { latitude?: string; longitude?: string; "place name"?: string; state?: string }[];
};

/**
 * US ZIP centroid from Zippopotam (HTTPS, free, no API key).
 * Returns null when unknown or unreachable.
 */
export async function geocodeUsZip(zipRaw: string): Promise<{
  lat: number;
  lng: number;
  place?: string;
} | null> {
  const zip = normalizeUsZip5(zipRaw);
  if (!zip) return null;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6_000);
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ZippoResponse;
    const place = body.places?.[0];
    if (!place?.latitude || !place.longitude) return null;
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const label =
      typeof place["place name"] === "string" && typeof place.state === "string"
        ? `${place["place name"]}, ${place.state}`
        : place["place name"];
    return { lat, lng, place: typeof label === "string" ? label : undefined };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
