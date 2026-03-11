import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ComplianceInput } from "./schemas";

const router = Router();

// GET /api/compliance
router.get(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer", "industry_user"),
  asyncHandler(async (req, res) => {
    const { industry_id, status } = req.query;
    let query = db("compliance_reports")
      .select("compliance_reports.*", "industries.name as industry_name")
      .join("industries", "compliance_reports.industry_id", "industries.id")
      .orderBy("compliance_reports.generated_at", "desc");

    if (industry_id) query = query.where("compliance_reports.industry_id", Number(industry_id));
    if (status) query = query.where("compliance_reports.status", status as string);

    const reports = await query;
    res.json(reports);
  }),
);

// POST /api/compliance — generate report
router.post(
  "/",
  authenticate,
  authorize("super_admin", "regional_officer"),
  validate(ComplianceInput),
  asyncHandler(async (req, res) => {
    const { industry_id, period_type, period_start, period_end } = req.body;

    // Check readings vs limits for the period
    const violations = await db("readings as r")
      .join("prescribed_limits as pl", "r.parameter_id", "pl.parameter_id")
      .join("monitoring_locations as ml", "r.location_id", "ml.id")
      .where("ml.industry_id", industry_id)
      .where("r.timestamp", ">=", period_start)
      .where("r.timestamp", "<=", period_end)
      .where("r.value", ">", db.ref("pl.max_value"))
      .count("r.id as count")
      .first();

    const status = Number((violations as any)?.count || 0) > 0 ? "non_compliant" : "compliant";

    const [id] = await db("compliance_reports").insert({
      industry_id,
      period_type,
      period_start,
      period_end,
      status,
    });

    res.status(201).json({ id, industry_id, period_type, period_start, period_end, status });
  }),
);

export { router as complianceRouter };
