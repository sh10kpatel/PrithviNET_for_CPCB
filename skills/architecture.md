# Architecture — PrithviNET

> Priority: **P0** — understand this before touching any code.

## System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js 14 Frontend (:3000)                │
│  App Router ─ SSR for citizen portal, CSR for dashboards    │
└─────────────────────────┬───────────────────────────────────┘
                          │  REST (TanStack Query)
                          │  WebSocket (Socket.IO client)
┌─────────────────────────▼───────────────────────────────────┐
│              Express + Socket.IO Backend (:4000)             │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐  │
│  │  Auth  │ │  CRUD  │ │  Alert   │ │ Comply │ │  IoT   │  │
│  │  RBAC  │ │  APIs  │ │  Engine  │ │ Check  │ │  Sim   │  │
│  └────────┘ └────────┘ └──────────┘ └────────┘ └────────┘  │
│       │            │          │            │                 │
│  ┌────▼────────────▼──────────▼────────────▼──┐             │
│  │              SQLite (Knex)                  │             │
│  │       ./server/data/prithvinet.db           │             │
│  └─────────────────────────────────────────────┘             │
│                          │ internal HTTP                     │
│              ┌───────────▼────────────────┐                  │
│              │  Python FastAPI ML (:8000)  │                  │
│              │  forecast / anomaly / copilot│                 │
│              └────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

## Service Communication Rules

| From | To | Protocol | Notes |
|---|---|---|---|
| Client | Express | REST + Socket.IO | **All** external traffic goes through Express |
| Express | ML service | Internal HTTP | `POST http://localhost:8000/ml/*` |
| Express | Client | Socket.IO push | `reading:new`, `alert:triggered`, `forecast:updated` |
| ML service | SQLite | File read | Read-only access for model training data |
| IoT Sim | Express | `POST /api/readings` | Same pipeline as manual/API data |

**Critical:** The frontend NEVER calls ml-service directly. Express proxies all ML requests.

## Data Flow: CPCB Live Data Integration

```
Express (cron: every 15 min)
  │
  ├─▶ cpcbClient.fetchStations()           # once on startup
  │     ├─ POST /aqi_dashboard/aqi_station_all_india
  │     ├─ Header: accessToken = base64(JSON({time, timeZoneOffset}))
  │     ├─ Body:   base64("{}")
  │     ├─ Response: base64(JSON) → decode → {states[], cities[], stations[]}
  │     └─ Upsert into monitoring_locations (cpcb_station_id, lat, lng, city, state, is_live)
  │
  ├─▶ cpcbClient.fetchReadings(stationId)   # per priority station, staggered
  │     ├─ POST /aqi_dashboard/aqi_all_Parameters
  │     ├─ Body:   base64(JSON({station_id, date}))
  │     ├─ Response: base64(JSON) → decode → {aqi, metrics[], chartData[]}
  │     ├─ Write to readings table (source = 'api')
  │     ├─ Run alert engine on each new reading
  │     └─ Emit reading:new via WebSocket
  │
  └─▶ Rate limiter: max 2 req/sec, exponential backoff on 400 (CAPTCHA)
        ├─ Priority stations: top 50 by population/AQI severity
        └─ Full sweep: stagger across 15 min window
```

### CPCB Encoding Protocol

All CPCB API requests and responses use base64 obfuscation:

```typescript
// Encoding
const accessToken = btoa(JSON.stringify({
  time: Date.now(),
  timeZoneOffset: new Date().getTimezoneOffset(),
}));
const body = btoa(JSON.stringify(payload));

// Decoding
const data = JSON.parse(atob(responseText));
```

### CPCB Station Data Structure

```typescript
// Response from /aqi_station_all_india (after base64 decode)
interface CPCBStationsResponse {
  states: Array<{ id: string; name: string; live: boolean }>;
  cities: Array<{
    stateID: string;
    citiesInState: Array<{ id: string; name: string; live: boolean }>;
  }>;
  stations: Array<{
    cityID: string;
    stationsInCity: Array<{
      id: string;        // "site_301"
      name: string;
      latitude: string;  // decimal string
      longitude: string;
      live: boolean;
      stateID: string;
      cityID: string;
    }>;
  }>;
}
```

### CPCB Readings Data Structure

```typescript
// Response from /aqi_all_Parameters (after base64 decode)
interface CPCBReadingsResponse {
  title: string;
  date: string;
  down: string;            // "true" | "false"
  aqi: {
    value: number;         // 0–500
    param: string;         // prominent pollutant
    remark: string;        // "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe"
    color: string;
  } | null;
  metrics: Array<{
    name: string;          // "PM2.5", "PM10", etc.
    param: string;
    avg: number | string;  // "-" if insufficient
    min: number | string;
    max: number | string;
  }>;
  chartData: Array<Array<[string, number, string]>>;  // [datetime, subindex, color]
}
```

### AQI Breakpoints (from CPCB config)

| Category | Range | Color |
|---|---|---|
| Good | 0–50 | #00B050 |
| Satisfactory | 51–100 | #92D050 |
| Moderate | 101–200 | #FFFF00 |
| Poor | 201–300 | #FF9900 |
| Very Poor | 301–400 | #FF0000 |
| Severe | 401–500 | #C00000 |

### Bhuvan WMS Map Tiles (ISRO)

Available as alternative/additional base map layers:

```typescript
L.tileLayer.wms("https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/", {
  LAYERS: "vehitrack",           // Base map (roads, boundaries)
  SERVICE: "WMS", VERSION: "1.1.1", FORMAT: "image/png",
});

L.tileLayer.wms("https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/", {
  LAYERS: "nuis:india_transport", // Transport overlay (highways, railways)
  SERVICE: "WMS", VERSION: "1.1.1", FORMAT: "image/png",
});
```

## Data Flow: Sensor Reading Ingestion

```
Sensor/IoT Sim ──POST /api/readings──▶ Express
  │
  ├─▶ Zod validate
  ├─▶ Write to `readings` table
  ├─▶ Alert Engine: compare against `prescribed_limits`
  │     ├─ threshold exceeded? → write `alert_events`, emit `alert:triggered`
  │     └─ anomaly check? → POST /ml/anomaly/detect
  ├─▶ Socket.IO: emit `reading:new` to all connected clients
  └─▶ Return 201 { id, location_id, value, timestamp }
```

## Data Flow: Forecast Request

```
Client ──GET /api/forecasts?location_id&parameter_id&hours──▶ Express
  │
  ├─▶ Check cache in `forecasts` table (< 1h old?)
  │     ├─ hit  → return cached forecast
  │     └─ miss → proxy to ML service
  │
  ├─▶ Express ──GET /ml/forecast──▶ FastAPI
  │     ├─ Prophet model: fit on historical readings
  │     ├─ Predict next N hours with confidence intervals
  │     └─ Return { timestamps[], values[], lower[], upper[] }
  │
  ├─▶ Cache result in `forecasts` table
  └─▶ Return to client
```

## Data Flow: Copilot Query

```
Client ──POST /api/copilot/query { question }──▶ Express
  │
  ├─▶ Build context: pull relevant industries, readings, limits, alerts
  ├─▶ POST /ml/copilot/query { question, context }──▶ FastAPI
  │     ├─ Construct system prompt + context + user question
  │     ├─ Call Gemini API
  │     └─ Return { answer, citations[], confidence }
  └─▶ Return to client
```

## Directory Structure (complete)

```
PrithviNET/
├── AGENTS.md
├── package.json              # root: concurrently scripts
├── skills/
│
├── client/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/           # Login, Register (no layout chrome)
│   │   ├── (protected)/      # Role-gated pages
│   │   │   ├── dashboard/
│   │   │   ├── industries/
│   │   │   ├── monitoring/
│   │   │   ├── alerts/
│   │   │   ├── compliance/
│   │   │   ├── copilot/
│   │   │   └── settings/
│   │   ├── public/           # Citizen portal (SSR, no auth)
│   │   ├── layout.tsx
│   │   └── providers.tsx     # QueryClient, SocketProvider, AuthProvider
│   ├── components/
│   │   ├── dashboard/        # Cards, LiveFeed, Sparkline
│   │   ├── maps/             # HeatMap, LocationMarker, RiskOverlay
│   │   ├── charts/           # ForecastChart, TrendChart, Comparison
│   │   ├── alerts/           # AlertPanel, EscalationFlow
│   │   ├── copilot/          # ChatPanel, QuerySuggestions
│   │   └── ui/               # 21st.dev / shadcn primitives
│   ├── hooks/
│   ├── lib/                  # api.ts, socket.ts, utils.ts
│   └── types/
│
├── server/                   # Express + TypeScript
│   ├── src/
│   │   ├── routes/           # auth, regions, industries, locations,
│   │   │                     # parameters, limits, readings, alerts,
│   │   │                     # compliance, dashboard, campaigns, forecasts
│   │   ├── middleware/       # auth, rbac, validate, errorHandler
│   │   ├── services/         # alertEngine, complianceChecker, mlClient
│   │   ├── simulator/        # iotSimulator.ts
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── connection.ts
│   │   ├── types/
│   │   ├── socket.ts
│   │   ├── app.ts
│   │   └── server.ts
│   └── tsconfig.json
│
└── ml-service/               # Python FastAPI
    ├── app/
    │   ├── main.py
    │   ├── routers/          # forecast, anomaly, copilot
    │   ├── models/           # forecaster, anomaly_detector, copilot_engine
    │   └── data/             # cached model artifacts
    ├── tests/
    └── requirements.txt
```

## Environment Variables

```env
# server/.env
PORT=4000
JWT_SECRET=<random-256-bit-hex>
DB_PATH=./data/prithvinet.db
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=<key>

# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000

# ml-service/.env
GEMINI_API_KEY=<key>
DB_PATH=../server/data/prithvinet.db
```

## Port Assignments

| Service | Port | Purpose |
|---|---|---|
| Next.js client | 3000 | Frontend UI |
| Express API | 4000 | REST + WebSocket gateway |
| FastAPI ML | 8000 | Internal ML endpoints |
