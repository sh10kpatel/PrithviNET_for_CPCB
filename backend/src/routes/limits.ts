import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/limits
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { parameter_id, zone_type } = req.query;
    let query = db("prescribed_limits")
      .select("prescribed_limits.*", "env_parameters.name as parameter_name", "monitoring_units.symbol as unit_symbol")
      .join("env_parameters", "prescribed_limits.parameter_id", "env_parameters.id")
      .join("monitoring_units", "env_parameters.unit_id", "monitoring_units.id")
      .orderBy("env_parameters.name");

    if (parameter_id) query = query.where("prescribed_limits.parameter_id", Number(parameter_id));
    if (zone_type) query = query.where("prescribed_limits.zone_type", zone_type as string);

    const limits = await query;
    res.json(limits);
  }),
);

// POST /api/limits
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    const [id] = await db("prescribed_limits").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/limits/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    await db("prescribed_limits").where({ id: req.params.id }).update(req.body);
    const updated = await db("prescribed_limits").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

export { router as limitsRouter };
