import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/summary — authenticated dashboard stats
router.get(
  "/summary",
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const totalStations = await db("monitoring_locations").count("id as count").first();
    const liveStations = await db("monitoring_locations").where("is_live", 1).count("id as count").first();
    const activeAlerts = await db("alert_events").where("acknowledged", 0).count("id as count").first();
    const todayReadings = await db("readings")
      .where("timestamp", ">=", new Date().toISOString().split("T")[0])
      .count("id as count")
      .first();

    // Latest AQI readings for air stations
    const latestAqi = await db("readings")
      .select("readings.location_id", "readings.value", "monitoring_locations.name as location_name")
      .join("monitoring_locations", "readings.location_id", "monitoring_locations.id")
      .join("env_parameters", "readings.parameter_id", "env_parameters.id")
      .where("env_parameters.name", "PM2.5")
      .whereIn(
        "readings.id",
        db("readings")
          .max("id as id")
          .join("env_parameters", "readings.parameter_id", "env_parameters.id")
          .where("env_parameters.name", "PM2.5")
          .groupBy("readings.location_id"),
      )
      .limit(20);

    res.json({
      totalStations: (totalStations as any)?.count || 0,
      liveStations: (liveStations as any)?.count || 0,
      activeAlerts: (activeAlerts as any)?.count || 0,
      todayReadings: (todayReadings as any)?.count || 0,
      latestAqi,
    });
  }),
);

// GET /api/dashboard/public — citizen portal (no auth)
router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    // Public: all live air stations with latest PM2.5 reading
    const stations = await db("monitoring_locations")
      .select("id", "name", "geo_lat", "geo_lng", "city", "state", "is_live", "type")
      .where("is_live", 1)
      .where("type", "air")
      .orderBy("state");

    const latestReadings = await db("readings")
      .select(
        "readings.location_id",
        "readings.value",
        "readings.timestamp",
        "env_parameters.name as parameter_name",
      )
      .join("env_parameters", "readings.parameter_id", "env_parameters.id")
      .whereIn(
        "readings.id",
        db("readings").max("id as id").groupBy("location_id", "parameter_id"),
      )
      .where("env_parameters.category", "air");

    res.json({ stations, latestReadings });
  }),
);

export { router as dashboardRouter };
