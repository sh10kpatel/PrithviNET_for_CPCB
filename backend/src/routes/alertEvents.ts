import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/alert-events
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { severity, acknowledged, limit = "50", offset = "0" } = req.query;

    let query = db("alert_events")
      .select(
        "alert_events.*",
        "alert_rules.severity",
        "alert_rules.threshold",
        "alert_rules.operator",
        "env_parameters.name as parameter_name",
        "readings.value",
        "readings.timestamp as reading_timestamp",
        "monitoring_locations.name as location_name",
      )
      .join("alert_rules", "alert_events.alert_rule_id", "alert_rules.id")
      .join("env_parameters", "alert_rules.parameter_id", "env_parameters.id")
      .join("readings", "alert_events.reading_id", "readings.id")
      .join("monitoring_locations", "readings.location_id", "monitoring_locations.id")
      .orderBy("alert_events.triggered_at", "desc")
      .limit(Number(limit))
      .offset(Number(offset));

    if (severity) query = query.where("alert_rules.severity", severity as string);
    if (acknowledged !== undefined) {
      query = query.where("alert_events.acknowledged", Number(acknowledged));
    }

    const events = await query;
    res.json(events);
  }),
);

// PATCH /api/alert-events/:id/acknowledge
router.patch(
  "/:id/acknowledge",
  authenticate,
  authorize("super_admin", "regional_officer", "monitoring_team"),
  asyncHandler(async (req, res) => {
    await db("alert_events").where({ id: req.params.id }).update({
      acknowledged: 1,
      resolution_notes: req.body.resolution_notes || null,
    });
    const updated = await db("alert_events").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

export { router as alertEventsRouter };
