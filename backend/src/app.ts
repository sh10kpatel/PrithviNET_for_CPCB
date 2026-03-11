import express from "express";
import cors from "cors";

import { authRouter } from "./routes/auth";
import { regionsRouter } from "./routes/regions";
import { industriesRouter } from "./routes/industries";
import { locationsRouter } from "./routes/locations";
import { parametersRouter } from "./routes/parameters";
import { limitsRouter } from "./routes/limits";
import { readingsRouter } from "./routes/readings";
import { alertsRouter } from "./routes/alerts";
import { alertEventsRouter } from "./routes/alertEvents";
import { complianceRouter } from "./routes/compliance";
import { campaignsRouter } from "./routes/campaigns";
import { dashboardRouter } from "./routes/dashboard";
import { forecastsRouter } from "./routes/forecasts";
import { copilotRouter } from "./routes/copilot";
import { cpcbRouter } from "./routes/cpcb";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): express.Application {
  const app = express();

  // ─── Global Middleware ───
  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
  app.use(express.json({ limit: "1mb" }));

  // ─── Health Check ───
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "prithvinet-api", timestamp: new Date().toISOString() });
  });

  // ─── Routes ───
  app.use("/api/auth", authRouter);
  app.use("/api/regions", regionsRouter);
  app.use("/api/industries", industriesRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/parameters", parametersRouter);
  app.use("/api/limits", limitsRouter);
  app.use("/api/readings", readingsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/alert-events", alertEventsRouter);
  app.use("/api/compliance", complianceRouter);
  app.use("/api/campaigns", campaignsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/forecasts", forecastsRouter);
  app.use("/api/copilot", copilotRouter);
  app.use("/api/cpcb", cpcbRouter);

  // ─── Error Handler (must be last) ───
  app.use(errorHandler);

  return app;
}
