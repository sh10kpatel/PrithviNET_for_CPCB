"""
Time-series data endpoint – fetch historical data with aggregation support.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.models.timeseries import TimeSeriesData
from app.schemas.timeseries import TimeSeriesRecord

router = APIRouter()

# All numeric columns that can be requested
VALID_PARAMETERS = [
    "aqi_pm25", "aqi_pm10", "aqi_so2", "aqi_no2", "aqi_co", "aqi_o3",
    "water_ph", "water_bod", "water_cod", "water_tss", "water_flow",
    "noise_leq", "noise_lday", "noise_lnight",
    "weather_temp", "weather_humidity", "weather_pressure",
    "weather_wind_speed", "weather_wind_direction",
]

GRANULARITY_INTERVALS = {
    "hourly": "1 hour",
    "6h": "6 hours",
    "daily": "1 day",
}


@router.get("/{station_id}/timeseries", response_model=list[TimeSeriesRecord])
def get_timeseries(
    station_id: str,
    start_date: datetime | None = Query(None, description="Start timestamp (ISO 8601)"),
    end_date: datetime | None = Query(None, description="End timestamp (ISO 8601)"),
    parameters: str | None = Query(None, description="Comma-separated parameter names"),
    granularity: str = Query("hourly", description="hourly | 6h | daily"),
    db: Session = Depends(get_db),
):
    """
    Retrieve time-series data for a single station.

    * **hourly** – raw rows (no aggregation)
    * **6h / daily** – AVG aggregation with date_trunc
    """

    # Validate station exists
    station = (
        db.query(MonitoringStation)
        .filter(MonitoringStation.station_id == station_id)
        .first()
    )
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    if granularity not in GRANULARITY_INTERVALS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid granularity. Must be one of: {', '.join(GRANULARITY_INTERVALS)}",
        )

    # Parse requested parameter columns
    requested_params: list[str] = []
    if parameters:
        for p in parameters.split(","):
            p = p.strip()
            if p and p in VALID_PARAMETERS:
                requested_params.append(p)
        if not requested_params:
            raise HTTPException(status_code=400, detail="No valid parameters specified")
    else:
        requested_params = VALID_PARAMETERS

    # Default date range: last 7 days
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(days=7)

    # ------- Raw (hourly) query – no aggregation -------
    if granularity == "hourly":
        query = (
            db.query(TimeSeriesData)
            .filter(
                TimeSeriesData.station_id == station_id,
                TimeSeriesData.timestamp >= start_date,
                TimeSeriesData.timestamp <= end_date,
            )
            .order_by(TimeSeriesData.timestamp)
        )
        rows = query.all()
        results: list[TimeSeriesRecord] = []
        for row in rows:
            record_data: dict = {
                "timestamp": row.timestamp,
                "station_id": row.station_id,
            }
            for param in requested_params:
                record_data[param] = getattr(row, param, None)
            results.append(TimeSeriesRecord(**record_data))
        return results

    # ------- Aggregated query (6h / daily) -------
    interval = GRANULARITY_INTERVALS[granularity]

    # Build AVG columns dynamically
    avg_columns = []
    for param in requested_params:
        col = getattr(TimeSeriesData, param)
        avg_columns.append(func.avg(col).label(param))

    bucket = func.date_trunc(
        "hour" if granularity == "6h" else "day",
        TimeSeriesData.timestamp,
    )

    # For 6h we need a custom bucket: floor to nearest 6-hour block
    if granularity == "6h":
        # PostgreSQL expression: date_trunc('day', ts) + interval '6h' * floor(extract(hour from ts) / 6)
        bucket = (
            func.date_trunc("day", TimeSeriesData.timestamp)
            + text("interval '6h'")
            * func.floor(func.extract("hour", TimeSeriesData.timestamp) / 6)
        )

    query = (
        db.query(
            bucket.label("bucket"),
            *avg_columns,
        )
        .filter(
            TimeSeriesData.station_id == station_id,
            TimeSeriesData.timestamp >= start_date,
            TimeSeriesData.timestamp <= end_date,
        )
        .group_by(text("1"))
        .order_by(text("1"))
    )

    rows = query.all()
    results = []
    for row in rows:
        record_data = {
            "timestamp": row.bucket,
            "station_id": station_id,
        }
        for param in requested_params:
            val = getattr(row, param, None)
            record_data[param] = round(val, 2) if val is not None else None
        results.append(TimeSeriesRecord(**record_data))
    return results
