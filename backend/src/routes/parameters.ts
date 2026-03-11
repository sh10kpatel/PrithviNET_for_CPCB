import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/parameters
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    let query = db("env_parameters")
      .select("env_parameters.*", "monitoring_units.symbol as unit_symbol", "monitoring_units.name as unit_name")
      .join("monitoring_units", "env_parameters.unit_id", "monitoring_units.id")
      .orderBy("env_parameters.category")
      .orderBy("env_parameters.name");

    if (category) query = query.where("env_parameters.category", category as string);

    const params = await query;
    res.json(params);
  }),
);

// GET /api/parameters/:id
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const param = await db("env_parameters")
      .select("env_parameters.*", "monitoring_units.symbol as unit_symbol")
      .join("monitoring_units", "env_parameters.unit_id", "monitoring_units.id")
      .where("env_parameters.id", req.params.id)
      .first();
    if (!param) {
      res.status(404).json({ error: "Parameter not found", code: "NOT_FOUND" });
      return;
    }
    res.json(param);
  }),
);

export { router as parametersRouter };
