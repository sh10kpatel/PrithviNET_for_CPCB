"""Pydantic request/response schemas for all ML endpoints."""

from pydantic import BaseModel, Field


# --- Forecast ---

class ForecastRequest(BaseModel):
    """Query parameters for forecast endpoint."""

    location_id: int
    parameter_id: int
    hours: int = Field(default=72, ge=1, le=168)


class ForecastPoint(BaseModel):
    """Single point in a forecast time series."""

    timestamp: str
    predicted_value: float
    lower_bound: float  # 95% CI
    upper_bound: float


class ForecastResponse(BaseModel):
    """Complete forecast response with metadata."""

    location_id: int
    parameter_id: int
    horizon_hours: int
    model: str  # "prophet" or "arima"
    points: list[ForecastPoint]


# --- Anomaly Detection ---

class ReadingInput(BaseModel):
    """Single reading for anomaly detection."""

    value: float
    timestamp: str


class AnomalyDetectRequest(BaseModel):
    """Request body for anomaly detection."""

    readings: list[ReadingInput]
    method: str = "isolation_forest"  # or "zscore"


class AnomalyResult(BaseModel):
    """Anomaly detection result for a single reading."""

    index: int
    value: float
    anomaly_score: float  # 0.0 = normal, 1.0 = extreme
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    """Complete anomaly detection response."""

    method: str
    results: list[AnomalyResult]
    anomaly_count: int


# --- Copilot ---

class CopilotRequest(BaseModel):
    """Request body for compliance copilot queries."""

    question: str = Field(min_length=5, max_length=1000)
    context: dict  # injected by Express: industries, readings, limits, etc.


class CopilotResponse(BaseModel):
    """Copilot response with answer, confidence, and citations."""

    answer: str
    confidence: float
    citations: list[str]
