"""
Heatmap endpoint – returns latest value per station for a chosen parameter.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.models.timeseries import TimeSeriesData
from app.schemas.compliance import HeatmapPoint, HeatmapResponse
from app.services.aqi_calculator import calculate_aqi

router = APIRouter()

# Map front-end parameter name → TimeSeriesData column name
PARAM_COLUMN_MAP = {
    "aqi_pm25": "aqi_pm25",
    "aqi_pm10": "aqi_pm10",
    "noise_leq": "noise_leq",
    "water_ph": "water_ph",
    "weather_temp": "weather_temp",
}


@router.get("/", response_model=HeatmapResponse)
def get_heatmap(
    parameter: str = Query("aqi_pm25", description="Parameter to visualise"),
    db: Session = Depends(get_db),
):
    """Return latest value of *parameter* for every station (for heatmap layer)."""

    if parameter not in PARAM_COLUMN_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid parameter. Must be one of: {', '.join(PARAM_COLUMN_MAP)}",
        )

    col_name = PARAM_COLUMN_MAP[parameter]

    # Subquery: latest timestamp per station
    latest_subq = (
        db.query(
            TimeSeriesData.station_id,
            func.max(TimeSeriesData.timestamp).label("max_ts"),
        )
        .group_by(TimeSeriesData.station_id)
        .subquery()
    )

    query = (
        db.query(
            MonitoringStation.station_id,
            MonitoringStation.latitude,
            MonitoringStation.longitude,
            getattr(TimeSeriesData, col_name).label("value"),
            # Also fetch sub-pollutants in case we need to compute AQI
            TimeSeriesData.aqi_pm25,
            TimeSeriesData.aqi_pm10,
            TimeSeriesData.aqi_so2,
            TimeSeriesData.aqi_no2,
            TimeSeriesData.aqi_co,
            TimeSeriesData.aqi_o3,
        )
        .outerjoin(
            latest_subq,
            MonitoringStation.station_id == latest_subq.c.station_id,
        )
        .outerjoin(
            TimeSeriesData,
            (TimeSeriesData.station_id == latest_subq.c.station_id)
            & (TimeSeriesData.timestamp == latest_subq.c.max_ts),
        )
    )

    rows = query.all()

    points: list[HeatmapPoint] = []
    values: list[float] = []

    for row in rows:
        # For AQI parameters compute the proper sub-index, otherwise use raw value
        if parameter in ("aqi_pm25", "aqi_pm10") and row.aqi_pm25 is not None:
            aqi_result = calculate_aqi(
                pm25=row.aqi_pm25,
                pm10=row.aqi_pm10,
                so2=row.aqi_so2,
                no2=row.aqi_no2,
                co=row.aqi_co,
                o3=row.aqi_o3,
            )
            value = aqi_result.get("aqi")
        else:
            value = row.value

        if value is None:
            continue

        points.append(
            HeatmapPoint(
                lat=row.latitude,
                lng=row.longitude,
                value=round(value, 2),
                station_id=row.station_id,
            )
        )
        values.append(value)

    min_val = min(values) if values else 0.0
    max_val = max(values) if values else 0.0

    return HeatmapResponse(
        parameter=parameter,
        points=points,
        min_value=round(min_val, 2),
        max_value=round(max_val, 2),
    )
