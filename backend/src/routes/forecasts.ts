import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getForecast } from "../services/mlClient";

const router = Router();

// GET /api/forecasts
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { location_id, parameter_id, hours = "72" } = req.query;

    if (!location_id || !parameter_id) {
      res.status(400).json({
        error: "location_id and parameter_id are required",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    try {
      const forecast = await getForecast(
        Number(location_id),
        Number(parameter_id),
        Number(hours),
      );
      res.json(forecast);
    } catch (err) {
      res.status(502).json({
        error: "ML service unavailable",
        code: "ML_SERVICE_ERROR",
        details: (err as Error).message,
      });
    }
  }),
);

export { router as forecastsRouter };
