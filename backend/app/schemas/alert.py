from pydantic import BaseModel
from datetime import datetime


class AlertBase(BaseModel):
    alert_id: int
    station_id: str
    timestamp: datetime
    parameter: str
    value: float
    threshold: float
    severity: str
    category: str
    status: str

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    status: str  # Acknowledged, Resolved


class AlertsResponse(BaseModel):
    alerts: list[AlertBase]
    total: int
    active_count: int
    acknowledged_count: int
    resolved_count: int
