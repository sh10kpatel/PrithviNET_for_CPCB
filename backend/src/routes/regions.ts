import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { RegionInput } from "./schemas";

const router = Router();

// GET /api/regions
router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const regions = await db("regional_offices").select("*").orderBy("name");
    res.json(regions);
  }),
);

// GET /api/regions/:id
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const region = await db("regional_offices").where({ id: req.params.id }).first();
    if (!region) {
      res.status(404).json({ error: "Region not found", code: "NOT_FOUND" });
      return;
    }
    res.json(region);
  }),
);

// POST /api/regions
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  validate(RegionInput),
  asyncHandler(async (req, res) => {
    const [id] = await db("regional_offices").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/regions/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    await db("regional_offices").where({ id: req.params.id }).update(req.body);
    const updated = await db("regional_offices").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

// DELETE /api/regions/:id
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    await db("regional_offices").where({ id: req.params.id }).delete();
    res.status(204).send();
  }),
);

export { router as regionsRouter };
