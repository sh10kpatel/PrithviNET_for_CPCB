"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StationWithLatest } from "@/types";
import { getAqiColor } from "@/types";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createStationIcon(aqi: number | null): L.DivIcon {
  const color = getAqiColor(aqi);
  const size = aqi !== null && aqi > 300 ? 14 : 10;
  return L.divIcon({
    className: "station-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  });
}

interface StationMapProps {
  stations: StationWithLatest[];
  center: [number, number];
  zoom: number;
  onStationClick: (stationId: string) => void;
  heatmapData?: [number, number, number][] | null;
  showHeatmap?: boolean;
}

export default function StationMap({
  stations,
  center,
  zoom,
  onStationClick,
  heatmapData,
  showHeatmap,
}: StationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when stations change
  const updateMarkers = useCallback(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    stations.forEach((station) => {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: createStationIcon(station.latest_aqi),
      });

      const aqiText =
        station.latest_aqi !== null
          ? `AQI: ${Math.round(station.latest_aqi)} (${station.aqi_category})`
          : "AQI: N/A";

      marker.bindPopup(
        `<div style="min-width:200px">
          <strong>${station.station_name}</strong><br/>
          <span style="color:#666">${station.city}, ${station.state}</span><br/>
          <span style="color:${getAqiColor(station.latest_aqi)};font-weight:600">${aqiText}</span><br/>
          <span style="color:#888;font-size:12px">Zone: ${station.zone_type} | ${station.monitoring_capabilities.join(", ")}</span>
        </div>`,
        { closeButton: true }
      );

      marker.on("click", () => {
        onStationClick(station.station_id);
      });

      markersRef.current!.addLayer(marker);
    });
  }, [stations, onStationClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Heatmap layer
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing heatmap
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap && heatmapData && heatmapData.length > 0) {
      import("leaflet.heat").then(() => {
        if (!mapRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heat = (L as any).heatLayer(heatmapData, {
          radius: 35,
          blur: 25,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.0: "#00b050",
            0.25: "#92d050",
            0.5: "#ffff00",
            0.75: "#ff9900",
            1.0: "#ff0000",
          },
        });
        heat.addTo(mapRef.current);
        heatLayerRef.current = heat;
      });
    }
  }, [showHeatmap, heatmapData]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: "400px" }}
    />
  );
}
