from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.api import stations, data, alerts, auth, heatmap, rankings, forecasting, anomaly, compliance, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="PrithviNet API",
    description="Smart Environmental Monitoring & Compliance Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(stations.router, prefix="/api/stations", tags=["Stations"])
app.include_router(data.router, prefix="/api/data", tags=["Time Series Data"])
app.include_router(heatmap.router, prefix="/api/heatmap", tags=["Heatmap"])
app.include_router(rankings.router, prefix="/api/rankings", tags=["Rankings"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(forecasting.router, prefix="/api/forecast", tags=["Forecasting"])
app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly Detection"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["AI Compliance Copilot"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "PrithviNet API"}
