"""PrithviNET ML Service — FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import anomaly, copilot, forecast

app = FastAPI(
    title="PrithviNET ML Service",
    description="Forecasting, anomaly detection, and AI compliance copilot for environmental monitoring.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],  # Express API only
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/ml")
app.include_router(anomaly.router, prefix="/ml")
app.include_router(copilot.router, prefix="/ml")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "prithvinet-ml"}
