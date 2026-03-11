# PrithviNET

Smart Environmental Monitoring & Compliance Platform for Air, Water & Noise — built for CPCB (Central Pollution Control Board) station data across India.

![Stack](https://img.shields.io/badge/Next.js_16-black?logo=next.js)
![Stack](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/PostgreSQL_16-336791?logo=postgresql&logoColor=white)
![Stack](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)

## Overview

PrithviNET is a full-stack environmental monitoring dashboard that visualizes real-time and historical data from 540 CPCB monitoring stations. It provides AQI tracking, water quality indices, noise level monitoring, and weather data — all on an interactive map with AI-powered forecasting, anomaly detection, and a compliance copilot.

### Key Features

- **Interactive Map** — Leaflet-based map with color-coded markers for 540 CPCB stations, heatmap overlay, and marker clustering
- **4-Tab Station Detail Panel** — Air Quality (AQI), Water Quality, Noise Levels, and Weather data with Recharts time-series charts
- **AI Forecasting** — Prophet-based (with diurnal pattern fallback) 24-72 hour parameter forecasts
- **Anomaly Detection** — Isolation Forest + Z-score based anomaly flagging on sensor readings
- **AI Compliance Copilot** — Google Gemini-powered natural language assistant for environmental compliance queries (rule-based fallback when no API key)
- **Alerts Dashboard** — 27,000+ auto-generated alerts based on CPCB prescribed limits with acknowledge/resolve workflow
- **Rankings** — State and city rankings by AQI, water quality, and noise levels
- **Report Generation** — PDF and PPTX export of station data and compliance reports
- **Role-Based Access** — 5 roles (SuperAdmin, RegionalOfficer, MonitoringTeam, IndustryUser, Citizen) with JWT authentication

## Architecture

```
┌─────────────────┐     HTTP      ┌─────────────────┐     SQL      ┌──────────────┐
│   Next.js 16    │ ────────────> │   FastAPI        │ ──────────> │ PostgreSQL   │
│   Frontend      │ <──────────── │   Backend        │ <────────── │ (Docker)     │
│   :3000         │   JSON/JWT    │   :8000          │             │ :5432        │
└─────────────────┘               └─────────────────┘             └──────────────┘
  Leaflet Maps                      SQLAlchemy ORM
  Recharts                          Prophet / Isolation Forest
  Zustand Store                     Google Gemini
  shadcn/ui v4                      ReportLab / python-pptx
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui v4 |
| Maps | Leaflet (vanilla with dynamic import), leaflet.heat, leaflet.markercluster |
| Charts | Recharts |
| State | Zustand |
| Backend | Python FastAPI, SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL 16 (Docker) |
| ML / AI | Prophet (forecasting), scikit-learn (anomaly detection), Google Gemini (copilot) |
| Reports | ReportLab (PDF), python-pptx (PPTX) |
| Auth | JWT (python-jose), bcrypt |

## Getting Started

### Prerequisites

- **Docker Desktop** (for PostgreSQL)
- **Python 3.11+**
- **Node.js 18+**

### 1. Clone and configure

```bash
git clone https://github.com/sh10kpatel/PrithviNET_for_CPCB.git
cd PrithviNET_for_CPCB
cp .env.example .env
# Edit .env — set JWT_SECRET and optionally GEMINI_API_KEY
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
# Wait for healthy status:
docker compose ps
```

### 3. Set up the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Seed the database (540 stations, 388,800 time-series records, 27,000 alerts)
python -m scripts.simulate_data

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Open the app

- **Frontend**: http://localhost:3000
- **API docs**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/api/health

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@prithvinet.gov.in | admin123 | SuperAdmin |
| officer@delhi.gov.in | officer123 | RegionalOfficer |
| monitor@cpcb.gov.in | monitor123 | MonitoringTeam |
| industry@factory.com | industry123 | IndustryUser |
| citizen@gmail.com | citizen123 | Citizen |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stations/` | List all stations with latest AQI |
| GET | `/api/stations/{id}` | Station detail with all parameters |
| GET | `/api/data/{id}/timeseries` | Time-series data for a station |
| GET | `/api/heatmap/` | Heatmap data points (lat/lng/intensity) |
| GET | `/api/rankings/` | State and city rankings |
| GET | `/api/alerts/` | List alerts (filterable) |
| GET | `/api/alerts/stats` | Alert statistics |
| PATCH | `/api/alerts/{id}` | Acknowledge/resolve an alert |
| GET | `/api/forecast/{id}` | AI forecast for a station |
| GET | `/api/anomaly/{id}` | Anomaly detection results |
| POST | `/api/compliance/simulate` | AI compliance copilot query |
| POST | `/api/reports/generate` | Generate PDF/PPTX report |
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Current user profile |

## Project Structure

```
PrithviNET/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (10 modules)
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models (5 tables)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic (AQI calc, forecasting, anomaly, compliance, reports)
│   ├── scripts/
│   │   └── simulate_data.py  # Database seeder (540 stations, 30 days hourly data)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── layout/     # Sidebar, AppShell
│   │   │   ├── map/        # Leaflet map with heatmap
│   │   │   ├── station/    # Station detail panel (4-tab)
│   │   │   └── ui/         # shadcn/ui components (22+)
│   │   ├── lib/            # API client, utilities
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript types, AQI constants
│   └── package.json
├── database/
│   └── init.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

## Data Model

- **540 CPCB stations** across India with geocoded coordinates
- **30 days of hourly simulated data** (~388,800 records) covering:
  - Air: PM2.5, PM10, SO2, NO2, CO, O3, AQI
  - Water: pH, dissolved oxygen, BOD, COD, total coliform
  - Noise: Leq, Lmax, Lmin (day/night)
  - Weather: temperature, humidity, wind speed, wind direction, rainfall
- **~5% anomaly bursts** injected (6-24 hour spikes at 2-3x normal) for anomaly detection demos
- **AQI calculated** using Indian NAQI/CPCB breakpoint standards (max of sub-indices)
- **48 prescribed limits** from CPCB standards for alert generation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://prithvinet:prithvinet123@localhost:5432/prithvinet` |
| `JWT_SECRET` | Secret key for JWT token signing | `your-secret-key-change-in-production` |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | — |
| `BACKEND_URL` | Backend API URL | `http://localhost:8000` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` |

## License

MIT
