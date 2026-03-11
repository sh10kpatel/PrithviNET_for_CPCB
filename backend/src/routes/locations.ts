import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { LocationInput } from "./schemas";

const router = Router();

// GET /api/locations
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { type, state, city, is_live } = req.query;
    let query = db("monitoring_locations").select("*").orderBy("name");

    if (type) query = query.where("type", type as string);
    if (state) query = query.where("state", state as string);
    if (city) query = query.where("city", city as string);
    if (is_live !== undefined) query = query.where("is_live", Number(is_live));

    const locations = await query;
    res.json(locations);
  }),
);

// GET /api/locations/:id
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const location = await db("monitoring_locations").where({ id: req.params.id }).first();
    if (!location) {
      res.status(404).json({ error: "Location not found", code: "NOT_FOUND" });
      return;
    }
    res.json(location);
  }),
);

// POST /api/locations
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer"),
  validate(LocationInput),
  asyncHandler(async (req, res) => {
    const [id] = await db("monitoring_locations").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/locations/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "regional_officer"),
  asyncHandler(async (req, res) => {
    await db("monitoring_locations").where({ id: req.params.id }).update(req.body);
    const updated = await db("monitoring_locations").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

export { router as locationsRouter };
