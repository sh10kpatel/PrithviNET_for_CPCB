from pydantic import BaseModel
from datetime import datetime


class TimeSeriesRecord(BaseModel):
    timestamp: datetime
    station_id: str

    # AQI
    aqi_pm25: float | None = None
    aqi_pm10: float | None = None
    aqi_so2: float | None = None
    aqi_no2: float | None = None
    aqi_co: float | None = None
    aqi_o3: float | None = None

    # Water
    water_ph: float | None = None
    water_bod: float | None = None
    water_cod: float | None = None
    water_tss: float | None = None
    water_flow: float | None = None

    # Noise
    noise_leq: float | None = None
    noise_lday: float | None = None
    noise_lnight: float | None = None

    # Weather
    weather_temp: float | None = None
    weather_humidity: float | None = None
    weather_pressure: float | None = None
    weather_wind_speed: float | None = None
    weather_wind_direction: float | None = None

    class Config:
        from_attributes = True


class TimeSeriesQuery(BaseModel):
    start_date: datetime | None = None
    end_date: datetime | None = None
    parameters: list[str] | None = None  # e.g. ["aqi_pm25", "weather_temp"]
    granularity: str = "hourly"  # hourly, 6h, daily


class ForecastPoint(BaseModel):
    timestamp: datetime
    predicted: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    station_id: str
    parameter: str
    hours: int
    forecast: list[ForecastPoint]
