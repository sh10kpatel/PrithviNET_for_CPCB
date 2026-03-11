# AGENTS.md — PrithviNET

Smart Environmental Monitoring & Compliance Platform for Air, Water & Noise.
Three-service architecture: Next.js frontend, Express+TypeScript API, Python FastAPI ML service.

> For deeper guidance on each subsystem, see the `docs/` directory.

## Project Structure

```
PrithviNET/
  frontend/        # Next.js 14 (App Router) + TypeScript
  backend/         # Express + TypeScript API + Socket.IO
  ml-service/      # Python FastAPI (forecasting, anomaly detection, copilot)
  docs/            # Detailed architecture & skill files per subsystem
```

## Build / Dev / Lint / Test Commands

### Frontend (Next.js) — runs on port 3000

```bash
cd frontend
npm install
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx prettier --check "src/**/*.{ts,tsx}"   # Format check
npx prettier --write "src/**/*.{ts,tsx}"   # Format fix
```

### Backend (Express) — runs on port 4000

```bash
cd backend
npm install
npm run dev          # ts-node-dev / nodemon
npm run build        # tsc
npm run lint         # ESLint
npm run migrate      # knex migrate:latest
npm run seed         # knex seed:run
```

### ML Service (FastAPI) — runs on port 8000

```bash
cd ml-service
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
ruff check app/                                # Lint
ruff format app/                               # Format
```

### Running Tests

```bash
# --- Frontend (Vitest + React Testing Library) ---
cd frontend
npx vitest run                                 # All tests
npx vitest run src/components/HeatMap.test.tsx  # Single test file
npx vitest run -t "renders markers"            # Single test by name

# --- Backend (Vitest + Supertest) ---
cd backend
npx vitest run                                 # All tests
npx vitest run src/routes/readings.test.ts     # Single test file
npx vitest run -t "returns 403 for citizen"    # Single test by name

# --- ML Service (pytest) ---
cd ml-service
pytest                                         # All tests
pytest tests/test_forecast.py                  # Single test file
pytest tests/test_forecast.py::test_72h -v     # Single test by name
pytest -k "anomaly"                            # Tests matching keyword
```

### Full Stack (concurrent)

```bash
# From repo root (requires concurrently in root package.json)
npm run dev          # Starts all three services
```

## Code Style — TypeScript (frontend + backend)

### Imports

Order imports in this sequence, separated by blank lines:
1. Node/built-in modules
2. External packages (npm)
3. Internal aliases (`@/`, `~/`)
4. Relative imports

```typescript
import { NextResponse } from "next/server";

import { z } from "zod";
import { Server } from "socket.io";

import { db } from "@/db/connection";
import type { Reading } from "@/types";

import { AlertEngine } from "./alertEngine";
```

### Formatting

- **Semicolons:** always
- **Quotes:** double quotes for strings
- **Indent:** 2 spaces
- **Trailing commas:** ES5 (objects, arrays, params)
- **Max line length:** 100 characters (soft)
- **Braces:** same-line opening (`if (x) {`)
- Enforced by Prettier config at each project root

### Types

- **Strict mode** enabled in all `tsconfig.json` (`"strict": true`)
- Prefer `interface` for object shapes, `type` for unions/intersections/utilities
- No `any` — use `unknown` + type narrowing, or Zod `.parse()` output
- All API request/response bodies typed via Zod schemas; infer types with `z.infer<>`
- Database row types generated from Knex or manually in `types/` dir
- Use `as const` for enum-like objects instead of TypeScript `enum`

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Components | PascalCase | `HeatMap.tsx`, `AlertPanel.tsx` |
| Hooks | camelCase, `use` prefix | `useSocket.ts`, `useAuth.ts` |
| Utilities / services | camelCase | `alertEngine.ts`, `mlClient.ts` |
| Types / interfaces | PascalCase | `Reading`, `AlertRule` |
| Constants | UPPER_SNAKE_CASE | `MAX_FORECAST_HOURS` |
| DB columns | snake_case | `regional_office_id` |
| API routes | kebab-case | `/api/alert-events` |
| Env vars | UPPER_SNAKE_CASE | `GEMINI_API_KEY` |
| Test files | co-located, `.test.ts(x)` suffix | `readings.test.ts` |

### Error Handling

- Express: all async route handlers wrapped in try/catch or an `asyncHandler` util
- Errors propagate to a centralized `errorHandler` middleware
- Standard error response shape: `{ error: string, code: string, details?: unknown }`
- HTTP status codes: 400 validation, 401 unauth, 403 forbidden, 404 not found, 500 internal
- Frontend: React error boundaries at layout level; TanStack Query `onError` for API failures
- Never swallow errors silently — always log with context

## Code Style — Python (ml-service)

- **Formatter/linter:** Ruff (replaces black + isort + flake8)
- **Type hints:** required on all function signatures
- **Naming:** snake_case for functions/variables, PascalCase for classes/Pydantic models
- **Docstrings:** Google style on all public functions
- **Models:** Pydantic `BaseModel` for all request/response schemas
- **Async:** use `async def` for all FastAPI endpoints
- **Error handling:** raise `HTTPException` with appropriate status codes; never bare `except:`

## Key Architectural Rules

- Express is the **single gateway** — the frontend never calls ml-service directly
- Express calls ml-service internally via HTTP (`http://localhost:8000/ml/...`)
- All sensor readings (IoT, manual, API) flow through the same `POST /api/readings` pipeline
- The alert engine runs synchronously on every new reading batch
- WebSocket events are emitted from the backend only; frontend clients are consumers
- SQLite is the single source of truth; ml-service reads from it or receives data via Express
- Role-based access is enforced at the Express middleware layer, not in the frontend

## Environment Variables

```env
# backend/.env
PORT=4000
JWT_SECRET=<random-256-bit>
DB_PATH=./data/prithvinet.db
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=<your-key>

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000

# ml-service/.env
GEMINI_API_KEY=<your-key>
DB_PATH=../backend/data/prithvinet.db
```

## Docs Reference

| File | Covers |
|---|---|
| `docs/architecture.md` | System design, service communication, data flow diagrams |
| `docs/database.md` | 15-table schema, Knex migrations, CPCB seed data |
| `docs/backend-api.md` | Express routes, RBAC, alert engine, WebSocket events |
| `docs/frontend.md` | Next.js patterns, Leaflet maps, Recharts, role routing |
| `docs/ml-service.md` | Prophet forecasting, anomaly detection, Gemini copilot |
| `docs/iot-simulator.md` | Realistic sensor stream generation |
