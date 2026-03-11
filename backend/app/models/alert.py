from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(10), ForeignKey("monitoring_stations.station_id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    parameter = Column(String(50), nullable=False)      # e.g. "aqi_pm25"
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False)        # Warning, Critical, Hazardous
    category = Column(String(20), nullable=False)        # AIR, WATER, NOISE
    status = Column(String(20), default="Active")        # Active, Acknowledged, Resolved
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    __table_args__ = (
        Index("idx_alerts_station", "station_id", timestamp.desc()),
        Index("idx_alerts_status", "status"),
    )

    def __repr__(self):
        return f"<Alert {self.alert_id}: {self.parameter}={self.value} at {self.station_id}>"
