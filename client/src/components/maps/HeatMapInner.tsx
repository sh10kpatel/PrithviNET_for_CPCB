"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";
import type { HeatMapProps } from "./HeatMap";

function HeatLayer({ points }: { points: HeatMapProps["points"] }) {
  const map = useMap();

  useEffect(() => {
    const data = points.map(
      (p) => [p.lat, p.lng, p.intensity] as [number, number, number],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heat = (L as any)
      .heatLayer(data, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
          0.2: "#10b981",
          0.4: "#f59e0b",
          0.6: "#f97316",
          0.8: "#ef4444",
          1.0: "#7c3aed",
        },
      })
      .addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function HeatMapInner({
  points,
  center = [22.5, 78.9],
  zoom = 5,
}: HeatMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-[500px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer points={points} />
    </MapContainer>
  );
}
