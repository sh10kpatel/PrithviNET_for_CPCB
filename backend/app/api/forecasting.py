"""
Forecasting endpoint – delegates to the forecasting service.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.schemas.timeseries import ForecastResponse

router = APIRouter()


@router.get("/{station_id}", response_model=ForecastResponse)
def get_forecast(
    station_id: str,
    parameter: str = Query("aqi_pm25", description="Parameter to forecast"),
    hours: int = Query(72, ge=1, le=168, description="Forecast horizon in hours"),
    db: Session = Depends(get_db),
):
    """
    Return a forecast for the given station and parameter.

    Delegates to ``app.services.forecasting.generate_forecast``.
    If the service module is not yet implemented a stub response is returned.
    """

    # Validate station
    station = (
        db.query(MonitoringStation)
        .filter(MonitoringStation.station_id == station_id)
        .first()
    )
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    try:
        from app.services.forecasting import generate_forecast

        result = generate_forecast(db, station_id, parameter, hours)
        return result
    except ImportError:
        # Service not implemented yet – return empty forecast
        return ForecastResponse(
            station_id=station_id,
            parameter=parameter,
            hours=hours,
            forecast=[],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {exc}")
