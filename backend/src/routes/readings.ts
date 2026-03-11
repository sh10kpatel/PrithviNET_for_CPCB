import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ReadingInput, ReadingBatch } from "./schemas";
import { checkAlerts } from "../services/alertEngine";
import { io } from "../socket";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/readings — single reading
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer", "monitoring_team", "industry_user"),
  validate(ReadingInput),
  asyncHandler(async (req: AuthRequest, res) => {
    const reading = { ...req.body, submitted_by: req.user!.id };
    const [id] = await db("readings").insert(reading);

    // Run alert engine
    await checkAlerts([
      {
        reading_id: id,
        location_id: reading.location_id,
        parameter_id: reading.parameter_id,
        value: reading.value,
      },
    ]);

    // Broadcast via WebSocket
    io.emit("reading:new", {
      id,
      locationId: reading.location_id,
      parameterId: reading.parameter_id,
      value: reading.value,
      unit: reading.unit_id,
      timestamp: reading.timestamp,
    });

    res.status(201).json({ id, ...reading });
  }),
);

// POST /api/readings/batch — batch readings
router.post(
  "/batch",
  authenticate,
  authorize("super_admin", "regional_officer", "monitoring_team"),
  validate(ReadingBatch),
  asyncHandler(async (req: AuthRequest, res) => {
    const { readings } = req.body;
    const results: Array<{ id: number }> = [];

    for (const reading of readings) {
      const [id] = await db("readings").insert({
        ...reading,
        submitted_by: req.user!.id,
      });
      results.push({ id });

      await checkAlerts([
        {
          reading_id: id,
          location_id: reading.location_id,
          parameter_id: reading.parameter_id,
          value: reading.value,
        },
      ]);

      io.emit("reading:new", {
        id,
        locationId: reading.location_id,
        parameterId: reading.parameter_id,
        value: reading.value,
        unit: reading.unit_id,
        timestamp: reading.timestamp,
      });
    }

    res.status(201).json({ count: results.length, ids: results.map((r) => r.id) });
  }),
);

// GET /api/readings — with filters
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { location_id, parameter_id, from, to, limit = "100", offset = "0" } = req.query;

    let query = db("readings")
      .select("readings.*", "env_parameters.name as parameter_name", "monitoring_units.symbol as unit_symbol")
      .join("env_parameters", "readings.parameter_id", "env_parameters.id")
      .join("monitoring_units", "readings.unit_id", "monitoring_units.id")
      .orderBy("readings.timestamp", "desc")
      .limit(Number(limit))
      .offset(Number(offset));

    if (location_id) query = query.where("readings.location_id", Number(location_id));
    if (parameter_id) query = query.where("readings.parameter_id", Number(parameter_id));
    if (from) query = query.where("readings.timestamp", ">=", from as string);
    if (to) query = query.where("readings.timestamp", "<=", to as string);

    const readings = await query;
    res.json(readings);
  }),
);

// GET /api/readings/latest — latest reading per location/parameter combo
router.get(
  "/latest",
  authenticate,
  asyncHandler(async (_req, res) => {
    const readings = await db("readings")
      .select(
        "readings.*",
        "env_parameters.name as parameter_name",
        "monitoring_locations.name as location_name",
        "monitoring_units.symbol as unit_symbol",
      )
      .join("env_parameters", "readings.parameter_id", "env_parameters.id")
      .join("monitoring_locations", "readings.location_id", "monitoring_locations.id")
      .join("monitoring_units", "readings.unit_id", "monitoring_units.id")
      .whereIn(
        "readings.id",
        db("readings").max("id as id").groupBy("location_id", "parameter_id"),
      );
    res.json(readings);
  }),
);

export { router as readingsRouter };
