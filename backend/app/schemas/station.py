from pydantic import BaseModel
from datetime import datetime


class StationBase(BaseModel):
    station_id: str
    station_name: str
    city: str
    state: str
    latitude: float
    longitude: float
    zone_type: str
    monitoring_capabilities: list[str]
    status: str = "Active"


class StationWithLatest(StationBase):
    """Station with the latest AQI reading for map markers."""
    latest_aqi: float | None = None
    latest_aqi_pm25: float | None = None
    latest_aqi_pm10: float | None = None
    latest_timestamp: datetime | None = None
    aqi_category: str | None = None  # Good, Satisfactory, Moderate, Poor, Very Poor, Severe

    class Config:
        from_attributes = True


class StationDetail(StationWithLatest):
    """Full station detail for the side panel."""
    latest_water_ph: float | None = None
    latest_water_bod: float | None = None
    latest_noise_leq: float | None = None
    latest_noise_lday: float | None = None
    latest_noise_lnight: float | None = None
    latest_weather_temp: float | None = None
    latest_weather_humidity: float | None = None
    latest_weather_pressure: float | None = None
    latest_weather_wind_speed: float | None = None
    active_alerts_count: int = 0
