"""Forecast router — GET /ml/forecast."""

from fastapi import APIRouter, HTTPException, Query

from app.models.forecaster import forecast_prophet
from app.schemas import ForecastResponse

router = APIRouter()


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    location_id: int = Query(..., description="Monitoring location ID"),
    parameter_id: int = Query(..., description="Environmental parameter ID"),
    hours: int = Query(default=72, ge=1, le=168, description="Forecast horizon in hours"),
) -> ForecastResponse:
    """Generate multi-step forecast with uncertainty estimates.

    Uses Prophet for locations with 24+ data points, falls back to ARIMA otherwise.
    """
    try:
        model_name, points = forecast_prophet(location_id, parameter_id, hours)
        return ForecastResponse(
            location_id=location_id,
            parameter_id=parameter_id,
            horizon_hours=hours,
            model=model_name,
            points=points,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")
