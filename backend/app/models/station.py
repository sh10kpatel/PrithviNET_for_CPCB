from sqlalchemy import Column, String, Float, Boolean, DateTime, func
from app.core.database import Base


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    station_id = Column(String(10), primary_key=True)
    station_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone_type = Column(String(50), nullable=False)  # Industrial, Commercial, Residential, Silence
    monitoring_capabilities = Column(String(255), nullable=False)  # "AIR,WATER,NOISE,WEATHER"
    status = Column(String(20), default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Station {self.station_id}: {self.station_name}>"

    def to_dict(self):
        return {
            "station_id": self.station_id,
            "station_name": self.station_name,
            "city": self.city,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "zone_type": self.zone_type,
            "monitoring_capabilities": self.monitoring_capabilities.split(",") if self.monitoring_capabilities else [],
            "status": self.status,
        }
