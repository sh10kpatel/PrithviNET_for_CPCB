import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CopilotQuery } from "./schemas";
import { queryCopilot } from "../services/mlClient";
import { db } from "../db/connection";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/copilot/query
router.post(
  "/query",
  authenticate,
  validate(CopilotQuery),
  asyncHandler(async (req: AuthRequest, res) => {
    const { question } = req.body;

    // Build context from recent data
    const recentReadings = await db("readings")
      .select(
        "readings.value",
        "readings.timestamp",
        "env_parameters.name as parameter",
        "monitoring_units.symbol as unit",
        "monitoring_locations.name as location",
      )
      .join("env_parameters", "readings.parameter_id", "env_parameters.id")
      .join("monitoring_units", "readings.unit_id", "monitoring_units.id")
      .join("monitoring_locations", "readings.location_id", "monitoring_locations.id")
      .orderBy("readings.timestamp", "desc")
      .limit(20);

    const limits = await db("prescribed_limits")
      .select(
        "prescribed_limits.max_value",
        "prescribed_limits.zone_type",
        "env_parameters.name as parameter",
        "monitoring_units.symbol as unit",
      )
      .join("env_parameters", "prescribed_limits.parameter_id", "env_parameters.id")
      .join("monitoring_units", "env_parameters.unit_id", "monitoring_units.id");

    const activeAlerts = await db("alert_events")
      .where("acknowledged", 0)
      .count("id as count")
      .first();

    const context = {
      recent_readings: recentReadings,
      limits,
      alerts: { active_count: (activeAlerts as any)?.count || 0 },
    };

    try {
      const result = await queryCopilot(question, context);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: "ML service unavailable",
        code: "ML_SERVICE_ERROR",
        details: (err as Error).message,
      });
    }
  }),
);

export { router as copilotRouter };
