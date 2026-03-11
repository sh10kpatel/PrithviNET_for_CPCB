import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { IndustryInput } from "./schemas";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/industries
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    let query = db("industries")
      .select("industries.*", "regional_offices.name as region_name")
      .join("regional_offices", "industries.regional_office_id", "regional_offices.id")
      .orderBy("industries.name");

    // Regional officers see only their region
    if (req.user!.role === "regional_officer" && req.user!.regionId) {
      query = query.where("industries.regional_office_id", req.user!.regionId);
    }
    // Industry users see only their own industry
    if (req.user!.role === "industry_user") {
      const user = await db("users").where({ id: req.user!.id }).first();
      if (user?.industry_id) {
        query = query.where("industries.id", user.industry_id);
      }
    }

    const industries = await query;
    res.json(industries);
  }),
);

// GET /api/industries/:id
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const industry = await db("industries").where({ id: req.params.id }).first();
    if (!industry) {
      res.status(404).json({ error: "Industry not found", code: "NOT_FOUND" });
      return;
    }
    res.json(industry);
  }),
);

// POST /api/industries
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer"),
  validate(IndustryInput),
  asyncHandler(async (req, res) => {
    const [id] = await db("industries").insert(req.body);
    res.status(201).json({ id, ...req.body });
  }),
);

// PATCH /api/industries/:id
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "regional_officer"),
  asyncHandler(async (req, res) => {
    await db("industries").where({ id: req.params.id }).update(req.body);
    const updated = await db("industries").where({ id: req.params.id }).first();
    res.json(updated);
  }),
);

export { router as industriesRouter };
