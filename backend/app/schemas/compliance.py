from pydantic import BaseModel


class ComplianceQuery(BaseModel):
    query: str
    station_id: str | None = None
    parameter: str | None = None
    change_percent: float | None = None


class ComplianceResponse(BaseModel):
    analysis: str
    predicted_impact: dict | None = None
    recommendations: list[str] | None = None
    affected_stations: list[str] | None = None


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    value: float
    station_id: str


class HeatmapResponse(BaseModel):
    parameter: str
    points: list[HeatmapPoint]
    min_value: float
    max_value: float


class RankingEntry(BaseModel):
    rank: int
    name: str  # city or state name
    avg_aqi: float | None = None
    avg_noise: float | None = None
    avg_water_ph: float | None = None
    station_count: int
    violation_count: int = 0
    trend: str = "stable"  # improving, worsening, stable


class ReportRequest(BaseModel):
    station_ids: list[str]
    start_date: str
    end_date: str
    format: str = "pdf"  # pdf or pptx
    sections: list[str] = ["aqi", "water", "noise", "weather"]
