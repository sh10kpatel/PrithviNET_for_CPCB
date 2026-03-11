"use client";

import { CircleMarker, Popup } from "react-leaflet";

const AQI_COLORS: Record<string, string> = {
  Good: "#00B050",
  Satisfactory: "#92D050",
  Moderate: "#FFFF00",
  Poor: "#FF9900",
  "Very Poor": "#FF0000",
  Severe: "#C00000",
};

function getAqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

interface StationMarkerProps {
  lat: number;
  lng: number;
  name: string;
  aqi: number | null;
  isLive: boolean;
  onClick?: () => void;
}

export function StationMarker({
  lat,
  lng,
  name,
  aqi,
  isLive,
  onClick,
}: StationMarkerProps) {
  const category = aqi !== null ? getAqiCategory(aqi) : null;
  const color = category ? AQI_COLORS[category] : "#9CA3AF";

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={8}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: isLive ? 0.8 : 0.3,
        weight: 1,
      }}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div className="text-sm">
          <strong>{name}</strong>
          {aqi !== null && (
            <div style={{ color }}>
              AQI: {aqi} ({category})
            </div>
          )}
          {!isLive && <div className="text-gray-400">Offline</div>}
        </div>
      </Popup>
    </CircleMarker>
  );
}
