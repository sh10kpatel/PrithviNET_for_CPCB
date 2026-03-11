"""
Rankings endpoint – city / state leaderboard based on latest readings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc, asc, case
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.models.timeseries import TimeSeriesData
from app.models.alert import Alert
from app.schemas.compliance import RankingEntry

router = APIRouter()


@router.get("/", response_model=list[RankingEntry])
def get_rankings(
    group_by: str = Query("city", description="city | state"),
    parameter: str = Query("aqi", description="aqi | noise | water"),
    order: str = Query("asc", description="asc | desc"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Compute average of latest readings grouped by city or state.

    Steps:
      1. Get latest row per station (subquery).
      2. Join with stations.
      3. GROUP BY city/state, compute AVG for the chosen parameter family.
      4. Also count active alerts (violations) per group via a correlated sub-query.
    """

    if group_by not in ("city", "state"):
        raise HTTPException(status_code=400, detail="group_by must be 'city' or 'state'")
    if parameter not in ("aqi", "noise", "water"):
        raise HTTPException(status_code=400, detail="parameter must be 'aqi', 'noise', or 'water'")
    if order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="order must be 'asc' or 'desc'")

    # Sub-query: latest timestamp per station
    latest_subq = (
        db.query(
            TimeSeriesData.station_id,
            func.max(TimeSeriesData.timestamp).label("max_ts"),
        )
        .group_by(TimeSeriesData.station_id)
        .subquery()
    )

    group_col = MonitoringStation.city if group_by == "city" else MonitoringStation.state

    # Build metric columns based on parameter family
    if parameter == "aqi":
        avg_aqi = func.avg(TimeSeriesData.aqi_pm25).label("avg_aqi")
        avg_noise = None
        avg_water = None
    elif parameter == "noise":
        avg_aqi = None
        avg_noise = func.avg(TimeSeriesData.noise_leq).label("avg_noise")
        avg_water = None
    else:  # water
        avg_aqi = None
        avg_noise = None
        avg_water = func.avg(TimeSeriesData.water_ph).label("avg_water")

    # We always compute all three so the response is fully populated
    select_cols = [
        group_col.label("name"),
        func.count(func.distinct(MonitoringStation.station_id)).label("station_count"),
        func.avg(TimeSeriesData.aqi_pm25).label("avg_aqi"),
        func.avg(TimeSeriesData.noise_leq).label("avg_noise"),
        func.avg(TimeSeriesData.water_ph).label("avg_water"),
    ]

    query = (
        db.query(*select_cols)
        .join(
            latest_subq,
            MonitoringStation.station_id == latest_subq.c.station_id,
        )
        .join(
            TimeSeriesData,
            (TimeSeriesData.station_id == latest_subq.c.station_id)
            & (TimeSeriesData.timestamp == latest_subq.c.max_ts),
        )
        .group_by(group_col)
    )

    # Determine sort column
    sort_label_map = {
        "aqi": "avg_aqi",
        "noise": "avg_noise",
        "water": "avg_water",
    }
    sort_col = sort_label_map[parameter]

    if order == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    query = query.limit(limit)
    rows = query.all()

    # Count active alerts per group in a single query
    alert_group_col = (
        MonitoringStation.city if group_by == "city" else MonitoringStation.state
    )
    violation_rows = (
        db.query(
            alert_group_col.label("name"),
            func.count(Alert.alert_id).label("violation_count"),
        )
        .join(MonitoringStation, Alert.station_id == MonitoringStation.station_id)
        .filter(Alert.status == "Active")
        .group_by(alert_group_col)
        .all()
    )
    violation_map = {r.name: r.violation_count for r in violation_rows}

    results: list[RankingEntry] = []
    for rank, row in enumerate(rows, start=1):
        results.append(
            RankingEntry(
                rank=rank,
                name=row.name,
                avg_aqi=round(row.avg_aqi, 1) if row.avg_aqi is not None else None,
                avg_noise=round(row.avg_noise, 1) if row.avg_noise is not None else None,
                avg_water_ph=round(row.avg_water, 2) if row.avg_water is not None else None,
                station_count=row.station_count,
                violation_count=violation_map.get(row.name, 0),
                trend="stable",  # Trend calculation can be added later
            )
        )

    return results
