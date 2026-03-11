from sqlalchemy import Column, Integer, String, Float, Text
from app.core.database import Base


class PrescribedLimit(Base):
    __tablename__ = "prescribed_limits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_type = Column(String(50), nullable=False)     # Industrial, Commercial, Residential, Silence
    parameter = Column(String(50), nullable=False)     # e.g. "aqi_pm25", "noise_lday"
    category = Column(String(20), nullable=False)      # AIR, WATER, NOISE
    limit_value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Limit {self.zone_type}/{self.parameter}: {self.limit_value} {self.unit}>"
