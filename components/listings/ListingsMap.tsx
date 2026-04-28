"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingCard } from "@/lib/types";
import { langFromParam } from "@/lib/i18n-lang";

type Props = {
  listings: ListingCard[];
  centerLat: number;
  centerLng: number;
};

export default function ListingsMap({ listings, centerLat, centerLng }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current).setView([centerLat, centerLng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const g = L.layerGroup().addTo(map);
    mapRef.current = map;
    groupRef.current = g;
    return () => {
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
    };
  }, [centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    const group = groupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const pts: L.LatLngExpression[] = [];
    const lang = langFromParam(params.get("lang"));

    for (const l of listings) {
      const lat = l.location_lat;
      const lng = l.location_lng;
      if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
        continue;
      }
      const m = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#1B4332",
        color: "#D4A017",
        weight: 2,
        fillOpacity: 0.88,
      });
      m.on("click", () => {
        router.push(lang === "es" ? `/listing/${l.id}?lang=es` : `/listing/${l.id}`);
      });
      m.addTo(group);
      pts.push([lat, lng]);
    }

    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
    } else {
      map.setView([centerLat, centerLng], 13);
    }
  }, [listings, centerLat, centerLng, router, params]);

  return (
    <div
      ref={mapEl}
      className="w-full h-[min(70vh,520px)] rounded-2xl border border-[#E5E0D8] overflow-hidden bg-[#E8E4DC]"
      role="application"
      aria-label="Mapa de anuncios"
    />
  );
}
