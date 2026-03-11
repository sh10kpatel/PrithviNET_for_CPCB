import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { AlertRuleInput } from "./schemas";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/alerts (alert rules)
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    let query = db("alert_rules")
      .select("alert_rules.*", "env_parameters.name as parameter_name")
      .join("env_parameters", "alert_rules.parameter_id", "env_parameters.id")
      .orderBy("alert_rules.severity", "desc");

    if (req.user!.role === "regional_officer" && req.user!.regionId) {
      query = query
        .leftJoin("monitoring_locations", "alert_rules.location_id", "monitoring_locations.id")
        .where((qb) => {
          qb.whereNull("monitoring_locations.id").orWhere(
            "monitoring_locations.regional_office_id",
            req.user!.regionId!,
          );
        });
    }

    const rules = await query;
    res.json(rules);
  }),
);

// POST /api/alerts
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer"),
  validate(AlertRuleInput),
  asyncHandler(async (req, res) => {
    const [id] = await db("alert_rules").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/alerts/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "regional_officer"),
  asyncHandler(async (req, res) => {
    await db("alert_rules").where({ id: req.params.id }).update(req.body);
    const updated = await db("alert_rules").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

// DELETE /api/alerts/:id
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    await db("alert_rules").where({ id: req.params.id }).delete();
    res.status(204).send();
  }),
);

export { router as alertsRouter };
