"""
Station endpoints – list all stations with latest AQI, get single station detail.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.models.timeseries import TimeSeriesData
from app.models.alert import Alert
from app.schemas.station import StationWithLatest, StationDetail
from app.services.aqi_calculator import calculate_aqi, get_aqi_category

router = APIRouter()


@router.get("/", response_model=list[StationWithLatest])
def list_stations(
    state: str | None = Query(None, description="Filter by state"),
    city: str | None = Query(None, description="Filter by city"),
    zone_type: str | None = Query(None, description="Filter by zone type"),
    capability: str | None = Query(None, description="Filter by monitoring capability (AIR, WATER, NOISE, WEATHER)"),
    db: Session = Depends(get_db),
):
    """Return every station with its latest AQI reading."""

    # Subquery: latest timestamp per station
    latest_subq = (
        db.query(
            TimeSeriesData.station_id,
            func.max(TimeSeriesData.timestamp).label("max_ts"),
        )
        .group_by(TimeSeriesData.station_id)
        .subquery()
    )

    # Main query: stations LEFT JOIN their latest time-series row
    query = (
        db.query(MonitoringStation, TimeSeriesData)
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

    # Optional filters
    if state:
        query = query.filter(MonitoringStation.state == state)
    if city:
        query = query.filter(MonitoringStation.city == city)
    if zone_type:
        query = query.filter(MonitoringStation.zone_type == zone_type)
    if capability:
        query = query.filter(MonitoringStation.monitoring_capabilities.contains(capability))

    query = query.order_by(MonitoringStation.station_id)
    rows = query.all()

    results: list[StationWithLatest] = []
    for station, ts in rows:
        # Compute AQI from sub-pollutant concentrations
        aqi_result = {"aqi": None, "category": "Insufficient Data"}
        if ts is not None:
            aqi_result = calculate_aqi(
                pm25=ts.aqi_pm25,
                pm10=ts.aqi_pm10,
                so2=ts.aqi_so2,
                no2=ts.aqi_no2,
                co=ts.aqi_co,
                o3=ts.aqi_o3,
            )

        results.append(
            StationWithLatest(
                station_id=station.station_id,
                station_name=station.station_name,
                city=station.city,
                state=station.state,
                latitude=station.latitude,
                longitude=station.longitude,
                zone_type=station.zone_type,
                monitoring_capabilities=(
                    station.monitoring_capabilities.split(",")
                    if station.monitoring_capabilities
                    else []
                ),
                status=station.status,
                latest_aqi=aqi_result.get("aqi"),
                latest_aqi_pm25=ts.aqi_pm25 if ts else None,
                latest_aqi_pm10=ts.aqi_pm10 if ts else None,
                latest_timestamp=ts.timestamp if ts else None,
                aqi_category=aqi_result.get("category"),
            )
        )

    return results


@router.get("/{station_id}", response_model=StationDetail)
def get_station(station_id: str, db: Session = Depends(get_db)):
    """Return full station detail including latest readings from ALL parameters."""

    station = (
        db.query(MonitoringStation)
        .filter(MonitoringStation.station_id == station_id)
        .first()
    )
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # Latest time-series row for this station
    ts = (
        db.query(TimeSeriesData)
        .filter(TimeSeriesData.station_id == station_id)
        .order_by(desc(TimeSeriesData.timestamp))
        .first()
    )

    # Count active alerts
    active_alerts = (
        db.query(func.count(Alert.alert_id))
        .filter(Alert.station_id == station_id, Alert.status == "Active")
        .scalar()
    ) or 0

    # AQI calculation
    aqi_result = {"aqi": None, "category": "Insufficient Data"}
    if ts is not None:
        aqi_result = calculate_aqi(
            pm25=ts.aqi_pm25,
            pm10=ts.aqi_pm10,
            so2=ts.aqi_so2,
            no2=ts.aqi_no2,
            co=ts.aqi_co,
            o3=ts.aqi_o3,
        )

    return StationDetail(
        station_id=station.station_id,
        station_name=station.station_name,
        city=station.city,
        state=station.state,
        latitude=station.latitude,
        longitude=station.longitude,
        zone_type=station.zone_type,
        monitoring_capabilities=(
            station.monitoring_capabilities.split(",")
            if station.monitoring_capabilities
            else []
        ),
        status=station.status,
        latest_aqi=aqi_result.get("aqi"),
        latest_aqi_pm25=ts.aqi_pm25 if ts else None,
        latest_aqi_pm10=ts.aqi_pm10 if ts else None,
        latest_timestamp=ts.timestamp if ts else None,
        aqi_category=aqi_result.get("category"),
        latest_water_ph=ts.water_ph if ts else None,
        latest_water_bod=ts.water_bod if ts else None,
        latest_noise_leq=ts.noise_leq if ts else None,
        latest_noise_lday=ts.noise_lday if ts else None,
        latest_noise_lnight=ts.noise_lnight if ts else None,
        latest_weather_temp=ts.weather_temp if ts else None,
        latest_weather_humidity=ts.weather_humidity if ts else None,
        latest_weather_pressure=ts.weather_pressure if ts else None,
        latest_weather_wind_speed=ts.weather_wind_speed if ts else None,
        active_alerts_count=active_alerts,
    )
