# Backend API — PrithviNET

> Priority: **P0** — the Express server is the central gateway for all data flow.

## Express App Structure

```typescript
// server/src/app.ts — factory pattern
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { readingsRouter } from "./routes/readings";
// ... other routers
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // --- Global middleware ---
  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
  app.use(express.json({ limit: "1mb" }));

  // --- Routes ---
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

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
```

## Middleware Chain

Order matters. Applied per-route:

```
cors → json → authenticate → authorize(roles) → validate(schema) → handler → errorHandler
```

### Auth Middleware (JWT)

```typescript
// server/src/middleware/auth.ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; regionId?: number };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token", code: "AUTH_REQUIRED" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthRequest["user"];
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token", code: "AUTH_INVALID" });
  }
}
```

### RBAC Middleware

```typescript
// server/src/middleware/rbac.ts
type Role = "super_admin" | "regional_officer" | "monitoring_team" | "industry_user" | "citizen";

export function authorize(...allowed: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role as Role)) {
      return res.status(403).json({ error: "Forbidden", code: "ROLE_DENIED" });
    }
    next();
  };
}
```

### Role-Route Matrix

| Route Group | super_admin | regional_officer | monitoring_team | industry_user | citizen |
|---|---|---|---|---|---|
| `POST /api/regions` | write | - | - | - | - |
| `GET /api/industries` | all | own region | read | own only | - |
| `POST /api/readings` | yes | yes | yes | own industry | - |
| `GET /api/alerts` | all | own region | assigned | own industry | - |
| `GET /api/dashboard/summary` | all | own region | assigned | own | - |
| `GET /api/dashboard/public` | no auth required — citizen portal |

### Validation Middleware (Zod)

```typescript
// server/src/middleware/validate.ts
import { z, ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}
```

### Error Handler

```typescript
// server/src/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[${req.method} ${req.path}]`, err.message, err.stack);
  const status = (err as any).status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    code: (err as any).code || "INTERNAL_ERROR",
  });
}
```

## Async Handler Utility

Wrap all async route handlers to avoid unhandled promise rejections:

```typescript
// server/src/utils/asyncHandler.ts
import type { Request, Response, NextFunction } from "express";

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
```

## Key Zod Schemas

```typescript
// server/src/routes/schemas.ts
import { z } from "zod";

export const ReadingInput = z.object({
  location_id: z.number().int().positive(),
  parameter_id: z.number().int().positive(),
  value: z.number(),
  unit_id: z.number().int().positive(),
  timestamp: z.string().datetime(),
  source: z.enum(["iot", "manual", "api"]),
});
export type ReadingInput = z.infer<typeof ReadingInput>;

export const ReadingBatch = z.object({
  readings: z.array(ReadingInput).min(1).max(1000),
});

export const AlertRuleInput = z.object({
  parameter_id: z.number().int().positive(),
  location_id: z.number().int().positive().optional(),
  industry_id: z.number().int().positive().optional(),
  operator: z.enum([">", "<", ">=", "<=", "=="]),
  threshold: z.number(),
  severity: z.enum(["info", "warning", "critical"]),
});

export const CopilotQuery = z.object({
  question: z.string().min(5).max(1000),
});
```

## Alert Engine

The alert engine runs synchronously on every new reading batch. It is the core compliance mechanism.

```typescript
// server/src/services/alertEngine.ts
import { db } from "../db/connection";
import { io } from "../socket";

interface AlertCheck {
  reading_id: number;
  location_id: number;
  parameter_id: number;
  value: number;
}

export async function checkAlerts(readings: AlertCheck[]): Promise<void> {
  for (const reading of readings) {
    const rules = await db("alert_rules")
      .where({ parameter_id: reading.parameter_id, enabled: 1 })
      .andWhere((q) =>
        q.whereNull("location_id").orWhere({ location_id: reading.location_id })
      );

    for (const rule of rules) {
      const breached = evaluateRule(reading.value, rule.operator, rule.threshold);
      if (breached) {
        const [eventId] = await db("alert_events").insert({
          alert_rule_id: rule.id,
          reading_id: reading.reading_id,
        });
        io.emit("alert:triggered", {
          eventId,
          ruleId: rule.id,
          severity: rule.severity,
          value: reading.value,
          threshold: rule.threshold,
          locationId: reading.location_id,
        });
      }
    }
  }
}

function evaluateRule(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case ">":  return value > threshold;
    case "<":  return value < threshold;
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case "==": return value === threshold;
    default:   return false;
  }
}
```

## WebSocket Events

```typescript
// server/src/socket.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

export let io: Server;

export function initSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`));
  });
}
```

### Event Catalog

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `reading:new` | server → client | `{ locationId, parameterId, value, unit, timestamp }` | New reading ingested |
| `alert:triggered` | server → client | `{ eventId, ruleId, severity, value, threshold, locationId }` | Alert engine detects breach |
| `forecast:updated` | server → client | `{ locationId, parameterId, horizon }` | New forecast cached |

## ML Service Client

Express proxies all ML requests through a centralized client:

```typescript
// server/src/services/mlClient.ts
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function getForecast(locationId: number, paramId: number, hours: number) {
  const res = await fetch(`${ML_URL}/ml/forecast?location_id=${locationId}&parameter_id=${paramId}&hours=${hours}`);
  if (!res.ok) throw new Error(`ML forecast failed: ${res.status}`);
  return res.json();
}

export async function detectAnomalies(readings: { value: number; timestamp: string }[]) {
  const res = await fetch(`${ML_URL}/ml/anomaly/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ readings }),
  });
  if (!res.ok) throw new Error(`ML anomaly failed: ${res.status}`);
  return res.json();
}

export async function queryCopilot(question: string, context: Record<string, unknown>) {
  const res = await fetch(`${ML_URL}/ml/copilot/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });
  if (!res.ok) throw new Error(`ML copilot failed: ${res.status}`);
  return res.json();
}
```

## CPCB Client Service

The Express server acts as the sole proxy for CPCB API data. The frontend never calls CPCB directly.

```typescript
// server/src/services/cpcbClient.ts
const CPCB_BASE = "https://airquality.cpcb.gov.in";

function makeAccessToken(): string {
  return Buffer.from(JSON.stringify({
    time: Date.now(),
    timeZoneOffset: new Date().getTimezoneOffset(),
  })).toString("base64");
}

function encodeBody(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeResponse(encoded: string): unknown {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

export async function fetchAllStations(): Promise<CPCBStationsResponse> {
  const res = await fetch(`${CPCB_BASE}/aqi_dashboard/aqi_station_all_india`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      accessToken: makeAccessToken(),
    },
    body: encodeBody({}),
  });
  if (res.status === 400) throw new Error("CPCB_CAPTCHA_TRIGGERED");
  if (!res.ok) throw new Error(`CPCB stations fetch failed: ${res.status}`);
  return decodeResponse(await res.text()) as CPCBStationsResponse;
}

export async function fetchStationReadings(
  stationId: string,
  date?: Date,
): Promise<CPCBReadingsResponse> {
  const payload = {
    station_id: stationId,
    date: (date || new Date()).toISOString(),
  };
  const res = await fetch(`${CPCB_BASE}/aqi_dashboard/aqi_all_Parameters`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      accessToken: makeAccessToken(),
    },
    body: encodeBody(payload),
  });
  if (res.status === 400) throw new Error("CPCB_CAPTCHA_TRIGGERED");
  if (!res.ok) throw new Error(`CPCB readings fetch failed: ${res.status}`);
  return decodeResponse(await res.text()) as CPCBReadingsResponse;
}
```

### CPCB Polling Strategy

```typescript
// server/src/services/cpcbPoller.ts
// Runs as a cron job: priority stations every 15 min, others every 1-6h
// Max 2 requests/second to avoid CAPTCHA
// On HTTP 400 (CAPTCHA): exponential backoff starting at 5 min
// Writes decoded readings to `readings` table with source = 'api'
// Updates `cpcb_cache` table with raw responses
// Runs alert engine on each new reading batch
```

### CPCB Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cpcb/stations` | any authenticated | List all CPCB stations (from DB cache) |
| `GET` | `/api/cpcb/stations/:id/readings` | any authenticated | Latest readings for a CPCB station |
| `POST` | `/api/cpcb/sync` | super_admin only | Force re-fetch all stations from CPCB |

## Implementation Priority

| Priority | Component | Notes |
|---|---|---|
| P0 | DB + migrations + seeds | Everything depends on this |
| P0 | Auth (register/login/me) + RBAC middleware | Gate all routes |
| P0 | `POST /api/readings` + alert engine | Core data pipeline |
| P0 | WebSocket setup + `reading:new` emission | Real-time capability |
| P1 | CRUD routes (regions, industries, locations, parameters, limits) | Entity management |
| P1 | `GET /api/dashboard/summary` + `/public` | Dashboard data |
| P1 | `GET /api/forecasts` (proxy to ML) | Forecast integration |
| P2 | `POST /api/copilot/query` (proxy to ML) | Copilot integration |
| P2 | Compliance report generation | Nice for demo |
| P1 | CPCB client + poller + routes | Live CPCB data integration |
| P2 | Campaigns CRUD | Low priority |
