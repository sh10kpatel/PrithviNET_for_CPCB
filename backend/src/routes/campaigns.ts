import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/campaigns
router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const campaigns = await db("monitoring_campaigns")
      .select("monitoring_campaigns.*", "users.name as created_by_name")
      .join("users", "monitoring_campaigns.created_by", "users.id")
      .orderBy("monitoring_campaigns.start_date", "desc");
    res.json(campaigns);
  }),
);

// POST /api/campaigns
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer"),
  asyncHandler(async (req, res) => {
    const [id] = await db("monitoring_campaigns").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/campaigns/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "regional_officer"),
  asyncHandler(async (req, res) => {
    await db("monitoring_campaigns").where({ id: req.params.id }).update(req.body);
    const updated = await db("monitoring_campaigns").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

export { router as campaignsRouter };
