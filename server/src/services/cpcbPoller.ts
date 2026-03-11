import cron from "node-cron";
import { db } from "../db/connection";
import { fetchStationReadings } from "./cpcbClient";
import { checkAlerts } from "./alertEngine";
import { io } from "../socket";

// Priority station IDs — metros + pollution hotspots (polled every 15 min)
const PRIORITY_STATIONS = new Set([
  "site_1", "site_2", "site_3", "site_5", "site_6",      // Delhi stations
  "site_301", "site_302", "site_303",                      // Mumbai
  "site_103", "site_104",                                  // Kolkata
  "site_119", "site_120",                                  // Chennai
  "site_132", "site_133",                                  // Bangalore
  "site_157", "site_158",                                  // Hyderabad
  "site_67", "site_68",                                    // Kanpur / Lucknow
  "site_277", "site_278",                                  // Pune
  "site_45", "site_46",                                    // Ahmedabad
]);

let backoffMs = 0;
const BACKOFF_INITIAL = 5 * 60 * 1000; // 5 minutes
const BACKOFF_MAX = 60 * 60 * 1000;    // 1 hour
const REQUEST_DELAY_MS = 500;          // 2 requests/sec max

// CPCB parameter name → env_parameters name mapping
const PARAM_MAP: Record<string, string> = {
  "PM2.5": "PM2.5",
  "PM10": "PM10",
  "SO2": "SO2",
  "NO2": "NO2",
  "CO": "CO",
  "OZONE": "O3",
  "NH3": "NH3",
  "Pb": "Pb",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollStation(stationId: string): Promise<void> {
  if (backoffMs > 0) {
    console.log(`[CPCB Poller] Backing off for ${backoffMs / 1000}s`);
    await sleep(backoffMs);
    backoffMs = 0;
  }

  try {
    const data = await fetchStationReadings(stationId);

    // Cache the response
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000);
    await db("cpcb_cache")
      .where({ station_id: stationId, endpoint: "readings" })
      .del();
    await db("cpcb_cache").insert({
      station_id: stationId,
      endpoint: "readings",
      response: JSON.stringify(data),
      fetched_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    // Convert to readings if metrics exist
    if (data.metrics && data.metrics.length > 0) {
      const location = await db("monitoring_locations")
        .where({ cpcb_station_id: stationId })
        .first();
      if (!location) return;

      for (const metric of data.metrics) {
        const paramName = PARAM_MAP[metric.param] || PARAM_MAP[metric.name];
        if (!paramName) continue;

        const avgValue = typeof metric.avg === "number" ? metric.avg : parseFloat(metric.avg as string);
        if (isNaN(avgValue)) continue;

        const param = await db("env_parameters").where({ name: paramName }).first();
        if (!param) continue;

        const [readingId] = await db("readings").insert({
          location_id: location.id,
          parameter_id: param.id,
          value: avgValue,
          unit_id: param.unit_id,
          timestamp: now.toISOString(),
          source: "api",
        });

        await checkAlerts([
          {
            reading_id: readingId,
            location_id: location.id,
            parameter_id: param.id,
            value: avgValue,
          },
        ]);

        io.emit("reading:new", {
          id: readingId,
          locationId: location.id,
          parameterId: param.id,
          value: avgValue,
          unit: param.unit_id,
          timestamp: now.toISOString(),
        });
      }
    }

    console.log(`[CPCB Poller] Polled ${stationId} — ${data.metrics?.length || 0} metrics`);
  } catch (err) {
    const message = (err as Error).message;
    if (message === "CPCB_CAPTCHA_TRIGGERED") {
      backoffMs = backoffMs === 0 ? BACKOFF_INITIAL : Math.min(backoffMs * 2, BACKOFF_MAX);
      console.warn(`[CPCB Poller] CAPTCHA triggered. Backoff: ${backoffMs / 1000}s`);
    } else {
      console.error(`[CPCB Poller] Error polling ${stationId}:`, message);
    }
  }
}

async function pollBatch(stationIds: string[]): Promise<void> {
  for (const id of stationIds) {
    await pollStation(id);
    await sleep(REQUEST_DELAY_MS);
  }
}

export function startCpcbPoller(): void {
  console.log("[CPCB Poller] Starting — priority stations polled every 15 min");

  // Priority stations: every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CPCB Poller] Polling priority stations...");
    const priorityLocations = await db("monitoring_locations")
      .whereNotNull("cpcb_station_id")
      .whereIn("cpcb_station_id", [...PRIORITY_STATIONS])
      .select("cpcb_station_id");

    const ids = priorityLocations.map(
      (l: { cpcb_station_id: string }) => l.cpcb_station_id,
    );
    await pollBatch(ids);
  });

  // All other stations: every 2 hours
  cron.schedule("0 */2 * * *", async () => {
    console.log("[CPCB Poller] Polling non-priority stations...");
    const otherLocations = await db("monitoring_locations")
      .whereNotNull("cpcb_station_id")
      .whereNotIn("cpcb_station_id", [...PRIORITY_STATIONS])
      .where("is_live", 1)
      .select("cpcb_station_id");

    const ids = otherLocations.map(
      (l: { cpcb_station_id: string }) => l.cpcb_station_id,
    );
    await pollBatch(ids);
  });
}
