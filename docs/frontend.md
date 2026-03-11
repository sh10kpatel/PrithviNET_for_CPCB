# Frontend — PrithviNET

> Priority: **P0** for dashboard and heatmap; **P1** for copilot and compliance views.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + 21st.dev component templates
- TanStack Query v5 for server state
- Recharts for time-series and forecast charts
- Leaflet + react-leaflet + leaflet-heat for maps
- Socket.IO client for real-time updates

## App Router Structure

```
frontend/app/
├── layout.tsx              # Root layout: font, Tailwind, Providers wrapper
├── providers.tsx           # QueryClientProvider, SocketProvider, AuthProvider
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (protected)/
│   ├── layout.tsx          # Sidebar + header, RoleGuard wrapper
│   ├── dashboard/page.tsx  # Main role-aware dashboard
│   ├── industries/page.tsx
│   ├── monitoring/page.tsx # Data submission + logs
│   ├── alerts/page.tsx
│   ├── compliance/page.tsx
│   ├── copilot/page.tsx    # AI chat interface
│   └── settings/page.tsx   # Admin: users, limits, regions
└── public/
    └── page.tsx            # Citizen portal — SSR, no auth
```

### Route Groups

- `(auth)` — no sidebar, no auth check. Redirect to dashboard if already logged in.
- `(protected)` — layout includes sidebar navigation, wraps children in `RoleGuard`.
- `public/` — citizen portal. Server-side rendered for SEO. No auth wrapper.

## Key Patterns

### Providers Setup

```tsx
// frontend/app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { SocketProvider } from "@/hooks/useSocket";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Role Guard

```tsx
// frontend/components/RoleGuard.tsx
"use client";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";

const ROLE_ROUTES: Record<string, string[]> = {
  super_admin:      ["/dashboard", "/industries", "/monitoring", "/alerts", "/compliance", "/copilot", "/settings"],
  regional_officer: ["/dashboard", "/industries", "/monitoring", "/alerts", "/compliance", "/copilot"],
  monitoring_team:  ["/dashboard", "/monitoring", "/alerts"],
  industry_user:    ["/dashboard", "/monitoring", "/alerts", "/compliance"],
  citizen:          [], // citizens use /public only
};

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSkeleton />;
  if (!user) redirect("/login");
  if (user.role === "citizen") redirect("/public");
  return <>{children}</>;
}
```

### Socket.IO Hook

```tsx
// frontend/hooks/useSocket.ts
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000");
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

// Usage: subscribe to specific events
export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [socket, event, handler]);
}
```

### API Client

```typescript
// frontend/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

## Leaflet Integration (Heatmap)

Leaflet requires `ssr: false` in Next.js because it accesses `window`.

```tsx
// frontend/components/maps/HeatMap.tsx
"use client";
import dynamic from "next/dynamic";

// Lazy load the actual map component with no SSR
const HeatMapInner = dynamic(() => import("./HeatMapInner"), { ssr: false });

export function HeatMap(props: HeatMapProps) {
  return <HeatMapInner {...props} />;
}
```

```tsx
// frontend/components/maps/HeatMapInner.tsx
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";

interface HeatMapProps {
  points: { lat: number; lng: number; intensity: number }[];
  center?: [number, number];
  zoom?: number;
}

function HeatLayer({ points }: { points: HeatMapProps["points"] }) {
  const map = useMap();
  useEffect(() => {
    const data = points.map((p) => [p.lat, p.lng, p.intensity] as [number, number, number]);
    const heat = (L as any).heatLayer(data, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.2: "green", 0.5: "yellow", 0.8: "orange", 1.0: "red" },
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
}

export default function HeatMapInner({ points, center = [22.5, 78.9], zoom = 5 }: HeatMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-[500px] w-full rounded-lg">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatLayer points={points} />
    </MapContainer>
  );
}
```

### Bhuvan WMS Tile Layer (ISRO — optional Indian map)

Use as an alternative base map layer for an India-specific look:

```tsx
// Option: Bhuvan WMS base layer (ISRO government map tiles)
import { WMSTileLayer } from "react-leaflet";

<WMSTileLayer
  url="https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/"
  layers="vehitrack"
  format="image/png"
  transparent={true}
  version="1.1.1"
/>
```

### AQI-Colored Station Markers

Station markers use CPCB AQI breakpoint colors (not just dots):

```tsx
// frontend/components/maps/StationMarker.tsx
import { CircleMarker, Popup } from "react-leaflet";

const AQI_COLORS: Record<string, string> = {
  Good:         "#00B050",
  Satisfactory: "#92D050",
  Moderate:     "#FFFF00",
  Poor:         "#FF9900",
  "Very Poor":  "#FF0000",
  Severe:       "#C00000",
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
}

export function StationMarker({ lat, lng, name, aqi, isLive }: StationMarkerProps) {
  const category = aqi !== null ? getAqiCategory(aqi) : null;
  const color = category ? AQI_COLORS[category] : "#9CA3AF"; // grey for no data

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={8}
      pathOptions={{ color, fillColor: color, fillOpacity: isLive ? 0.8 : 0.3, weight: 1 }}
    >
      <Popup>
        <div className="text-sm">
          <strong>{name}</strong>
          {aqi !== null && (
            <div style={{ color }}>AQI: {aqi} ({category})</div>
          )}
          {!isLive && <div className="text-gray-400">Offline</div>}
        </div>
      </Popup>
    </CircleMarker>
  );
}
```

## Recharts Forecast Chart (with confidence bands)

```tsx
// frontend/components/charts/ForecastChart.tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line } from "recharts";

interface ForecastPoint {
  timestamp: string;
  value: number;     // predicted
  lower: number;     // 95% CI lower
  upper: number;     // 95% CI upper
  actual?: number;   // historical actual (if available)
}

export function ForecastChart({ data, unit }: { data: ForecastPoint[]; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} />
        <YAxis unit={` ${unit}`} />
        <Tooltip />
        <Area dataKey="upper" stroke="none" fill="#3b82f6" fillOpacity={0.1} />
        <Area dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} />
        <Line dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
        {data[0]?.actual !== undefined && (
          <Line dataKey="actual" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

## Tailwind Theme Tokens

Define severity/pollution colors consistently:

```typescript
// tailwind.config.ts extend.colors
{
  pollution: {
    good:      "#10b981", // green  — AQI 0-50
    moderate:  "#f59e0b", // amber  — AQI 51-100
    unhealthy: "#f97316", // orange — AQI 101-200
    severe:    "#ef4444", // red    — AQI 201-300
    hazardous: "#7c3aed", // purple — AQI 300+
  },
  severity: {
    info:     "#3b82f6", // blue
    warning:  "#f59e0b", // amber
    critical: "#ef4444", // red
  },
}
```

## Implementation Priority

| Priority | Component | Notes |
|---|---|---|
| P0 | Auth pages (login/register) + AuthProvider | Unblocks everything |
| P0 | Dashboard page with live-updating cards | Core demo screen |
| P0 | HeatMap component with pollution overlay | High visual impact |
| P0 | Socket.IO integration for live readings | Real-time capability |
| P1 | ForecastChart with confidence bands | Innovation feature |
| P1 | Alert panel with severity indicators | Compliance tracking |
| P1 | Citizen public portal | Innovation feature |
| P1 | Copilot chat interface | Innovation feature |
| P2 | Industry management CRUD pages | Entity management |
| P2 | Compliance report views | Nice for demo |
| P2 | Monitoring campaign pages | Low priority |
