import { db } from "../db/connection";
import { io } from "../socket";
import { checkAlerts } from "../services/alertEngine";

interface StationConfig {
  locationId: number;
  parameters: { id: number; name: string; unitId: number }[];
  zone: "industrial" | "residential" | "ambient";
}

const BASELINES: Record<string, Record<string, number>> = {
  "PM2.5": { industrial: 85, residential: 45, ambient: 35 },
  "PM10": { industrial: 140, residential: 70, ambient: 55 },
  "SO2": { industrial: 55, residential: 15, ambient: 10 },
  "NO2": { industrial: 60, residential: 25, ambient: 18 },
  "CO": { industrial: 2.8, residential: 1.2, ambient: 0.8 },
  "O3": { industrial: 80, residential: 60, ambient: 50 },
  "NH3": { industrial: 200, residential: 50, ambient: 25 },
  "Pb": { industrial: 0.6, residential: 0.2, ambient: 0.1 },
  "pH": { industrial: 7.2, residential: 7.5, ambient: 7.4 },
  "BOD": { industrial: 22, residential: 8, ambient: 4 },
  "COD": { industrial: 180, residential: 50, ambient: 25 },
  "DO": { industrial: 4.5, residential: 6.5, ambient: 7.0 },
  "TDS": { industrial: 1500, residential: 600, ambient: 350 },
  "Fecal Coliform": { industrial: 700, residential: 200, ambient: 50 },
  "Leq(day)": { industrial: 68, residential: 48, ambient: 42 },
  "Leq(night)": { industrial: 62, residential: 40, ambient: 35 },
};

let stations: StationConfig[] = [];
let intervalHandle: ReturnType<typeof setInterval> | null = null;

const SPIKE_PROB = parseFloat(process.env.SIMULATOR_SPIKE_PROB || "0.03");
const INTERVAL_MS = parseInt(process.env.SIMULATOR_INTERVAL_MS || "5000", 10);

export async function initSimulator(): Promise<void> {
  stations = await loadStationConfigs();
  console.log(`[IoT Simulator] Loaded ${stations.length} stations, interval ${INTERVAL_MS}ms`);

  if (stations.length === 0) {
    console.warn("[IoT Simulator] No stations found — skipping");
    return;
  }

  intervalHandle = setInterval(async () => {
    try {
      await emitReadings();
    } catch (err) {
      console.error("[IoT Simulator] Error emitting readings:", (err as Error).message);
    }
  }, INTERVAL_MS);
}

export function stopSimulator(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[IoT Simulator] Stopped");
  }
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

  if (readings.length === 0) return;

  // Batch insert all readings
  const firstId = (await db("readings").insert(readings))[0];

  // Run alert checks and broadcast
  const alertInputs = readings.map((r, i) => ({
    reading_id: firstId + i,
    location_id: r.location_id,
    parameter_id: r.parameter_id,
    value: r.value,
  }));
  await checkAlerts(alertInputs);

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    io.emit("reading:new", {
      id: firstId + i,
      locationId: r.location_id,
      parameterId: r.parameter_id,
      value: r.value,
      unit: r.unit_id,
      timestamp: r.timestamp,
    });
  }
}

function generateValue(param: string, zone: string, now: Date): number {
  const base = BASELINES[param]?.[zone] ?? 50;
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay();

  // Diurnal cycle (peaks at 8am and 8pm for traffic-related pollutants)
  const diurnal = base * 0.15 * Math.sin((2 * Math.PI * (hour - 8)) / 12);

  // Weekend reduction
  const weekend = day === 0 || day === 6 ? -base * 0.1 : 0;

  // Gaussian noise (Box-Muller)
  const noise = gaussianRandom() * base * 0.08;

  // Spike event
  const spike = Math.random() < SPIKE_PROB ? base * (1.5 + Math.random() * 2) : 0;

  const value = base + diurnal + weekend + noise + spike;

  // Clamp: pH between 4-10, DO positive, others non-negative
  if (param === "pH") return Math.max(4.0, Math.min(10.0, value));
  if (param === "DO") return Math.max(0.5, value);
  return Math.max(0, value);
}

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

async function loadStationConfigs(): Promise<StationConfig[]> {
  // Only load water and noise stations — air is handled by CPCB poller
  const locations = await db("monitoring_locations")
    .whereNull("cpcb_station_id")
    .whereIn("type", ["water", "noise"])
    .select("*");

  const configs: StationConfig[] = [];
  for (const loc of locations) {
    const params = await db("env_parameters")
      .where("category", loc.type)
      .select("id", "name", "unit_id as unitId");

    if (params.length > 0) {
      configs.push({
        locationId: loc.id,
        parameters: params,
        zone: loc.industry_id ? "industrial" : "ambient",
      });
    }
  }

  return configs;
}
