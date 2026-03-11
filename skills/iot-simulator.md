# IoT Simulator — PrithviNET

> Priority: **P1** — needed once `POST /api/readings` and WebSocket are working.

## Purpose

Generates realistic environmental sensor readings for water and noise monitoring stations across India.
Air quality data for CPCB CAAQM stations is fetched from the live CPCB API (see `backend-api.md` CPCB Client).
The IoT simulator covers:
- **Water quality** stations (pH, BOD, COD, DO, TDS, Fecal Coliform) — ~8-10 stations
- **Noise monitoring** stations (dB(A) Leq for industrial/commercial/residential/silence zones) — ~8-10 stations
- **Fallback air data** for non-CPCB or offline air stations

Pushes data through the same `POST /api/readings` pipeline as real sensors, so the alert engine
and anomaly detection process simulated data identically to production data.

## Architecture

```
iotSimulator.ts (node-cron or setInterval)
  │
  ├── For each station: generate readings for all its parameters
  ├── POST /api/readings (batch) → Express → DB + Alert Engine + WebSocket
  └── Runs every 5 seconds (configurable)
```

## Realistic Data Generation Model

Each parameter value is computed as:

```
value = baseline
      + diurnal_component(hour)     # time-of-day pattern
      + weekly_component(day)       # weekday/weekend variation
      + noise(gaussian)             # random fluctuation
      + spike(probability)          # occasional pollution events
      + drift(trend)                # slow seasonal drift
```

### Component Details

| Component | Formula | Notes |
|---|---|---|
| Baseline | Per parameter per zone | Industrial: higher; residential: lower |
| Diurnal | `amplitude * sin(2π * hour/24 + phase)` | PM2.5 peaks at 8am and 8pm (traffic) |
| Weekly | `factor * (isWeekend ? 0.8 : 1.0)` | Industrial output lower on weekends |
| Noise | `gaussian(0, σ)` where σ = 5-10% of baseline | Natural variation |
| Spike | `if (random() < 0.03) value += 2-5x baseline` | ~3% chance per reading |
| Drift | `0.01 * daysSinceStart * direction` | Very slow trend, optional |

### Baseline Values by Parameter

```typescript
const BASELINES: Record<string, { industrial: number; residential: number; ambient: number }> = {
  "PM2.5":  { industrial: 85, residential: 45, ambient: 35 },
  "PM10":   { industrial: 140, residential: 70, ambient: 55 },
  "SO2":    { industrial: 55, residential: 15, ambient: 10 },
  "NO2":    { industrial: 60, residential: 25, ambient: 18 },
  "CO":     { industrial: 2.8, residential: 1.2, ambient: 0.8 },
  "O3":     { industrial: 80, residential: 60, ambient: 50 },
  "pH":     { industrial: 7.2, residential: 7.5, ambient: 7.4 },
  "BOD":    { industrial: 22, residential: 8, ambient: 4 },
  "DO":     { industrial: 4.5, residential: 6.5, ambient: 7.0 },
  "noise":  { industrial: 68, residential: 48, ambient: 42 },
};
```

## Implementation

```typescript
// server/src/simulator/iotSimulator.ts
import cron from "node-cron";
import { db } from "../db/connection";
import { io } from "../socket";
import { checkAlerts } from "../services/alertEngine";

interface StationConfig {
  locationId: number;
  parameters: { id: number; name: string; unitId: number }[];
  zone: "industrial" | "residential" | "ambient";
}

let stations: StationConfig[] = [];

export async function initSimulator(): Promise<void> {
  // Load stations and their parameters from the database
  stations = await loadStationConfigs();
  console.log(`IoT Simulator: loaded ${stations.length} stations`);

  // Emit readings every 5 seconds
  cron.schedule("*/5 * * * * *", async () => {
    await emitReadings();
  });
}

async function emitReadings(): Promise<void> {
  const now = new Date();
  const readings: Array<{
    location_id: number;
    parameter_id: number;
    value: number;
    unit_id: number;
    timestamp: string;
    source: "iot";
  }> = [];

  for (const station of stations) {
    for (const param of station.parameters) {
      const value = generateValue(param.name, station.zone, now);
      readings.push({
        location_id: station.locationId,
        parameter_id: param.id,
        value: Math.round(value * 100) / 100,
        unit_id: param.unitId,
        timestamp: now.toISOString(),
        source: "iot",
      });
    }
  }

  // Batch insert
  const insertedIds = await db("readings").insert(readings);

  // Run alert checks
  const alertInputs = readings.map((r, i) => ({
    reading_id: insertedIds[i],
    location_id: r.location_id,
    parameter_id: r.parameter_id,
    value: r.value,
  }));
  await checkAlerts(alertInputs);

  // Broadcast to connected clients
  for (const r of readings) {
    io.emit("reading:new", r);
  }
}

function generateValue(param: string, zone: string, now: Date): number {
  const base = BASELINES[param]?.[zone as keyof typeof BASELINES[string]] ?? 50;
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay();

  // Diurnal cycle (peaks at 8am and 8pm for traffic-related pollutants)
  const diurnal = base * 0.15 * Math.sin((2 * Math.PI * (hour - 8)) / 12);

  // Weekend reduction
  const weekend = (day === 0 || day === 6) ? -base * 0.1 : 0;

  // Gaussian noise
  const noise = gaussianRandom() * base * 0.08;

  // Spike event (~3% probability)
  const spike = Math.random() < 0.03 ? base * (1.5 + Math.random() * 2) : 0;

  const value = base + diurnal + weekend + noise + spike;

  // Clamp to reasonable range (no negative values for most params)
  return param === "pH"
    ? Math.max(4.0, Math.min(10.0, value))
    : Math.max(0, value);
}

function gaussianRandom(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

async function loadStationConfigs(): Promise<StationConfig[]> {
  const locations = await db("monitoring_locations").select("*");
  const configs: StationConfig[] = [];

  for (const loc of locations) {
    const params = await db("env_parameters")
      .where("category", loc.type)
      .select("id", "name", "unit_id");

    configs.push({
      locationId: loc.id,
      parameters: params,
      zone: loc.industry_id ? "industrial" : "ambient",
    });
  }
  return configs;
}
```

## Configuration

| Setting | Default | Notes |
|---|---|---|
| Emission interval | 5 seconds | Adjustable via `SIMULATOR_INTERVAL_MS` env var |
| Spike probability | 3% | Set higher for demo scenarios |
| Noise amplitude | 8% of baseline | Realistic for calibrated sensors |
| Stations | All from `monitoring_locations` table | Loaded from seed data |

## Demo Mode

For the 3-minute demo, increase spike probability to 10-15% to guarantee visible alert triggers
and interesting heatmap activity. Set via env var:

```env
SIMULATOR_SPIKE_PROB=0.12
SIMULATOR_INTERVAL_MS=3000
```

## Testing

```bash
cd server
npx vitest run src/simulator/iotSimulator.test.ts
```

Test that:
- `generateValue` returns values within expected ranges
- Spike events produce values > 2x baseline
- Diurnal pattern shows higher values during peak hours
- Batch insert + alert check pipeline works end-to-end
