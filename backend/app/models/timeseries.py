from sqlalchemy import Column, BigInteger, String, Float, DateTime, ForeignKey, UniqueConstraint, Index
from app.core.database import Base


class TimeSeriesData(Base):
    __tablename__ = "time_series_data"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    station_id = Column(String(10), ForeignKey("monitoring_stations.station_id"), nullable=False)

    # AQI Parameters
    aqi_pm25 = Column(Float, nullable=True)   # ug/m3
    aqi_pm10 = Column(Float, nullable=True)   # ug/m3
    aqi_so2 = Column(Float, nullable=True)    # ug/m3
    aqi_no2 = Column(Float, nullable=True)    # ug/m3
    aqi_co = Column(Float, nullable=True)     # mg/m3
    aqi_o3 = Column(Float, nullable=True)     # ug/m3

    # Water Parameters
    water_ph = Column(Float, nullable=True)
    water_bod = Column(Float, nullable=True)   # mg/L
    water_cod = Column(Float, nullable=True)   # mg/L
    water_tss = Column(Float, nullable=True)   # mg/L
    water_flow = Column(Float, nullable=True)  # m3/h

    # Noise Parameters
    noise_leq = Column(Float, nullable=True)     # dB
    noise_lday = Column(Float, nullable=True)     # dB
    noise_lnight = Column(Float, nullable=True)   # dB

    # Weather Parameters
    weather_temp = Column(Float, nullable=True)           # Celsius
    weather_humidity = Column(Float, nullable=True)       # %
    weather_pressure = Column(Float, nullable=True)       # hPa
    weather_wind_speed = Column(Float, nullable=True)     # m/s
    weather_wind_direction = Column(Float, nullable=True) # degrees 0-360

    __table_args__ = (
        UniqueConstraint("timestamp", "station_id", name="uq_ts_station"),
        Index("idx_ts_station_time", "station_id", timestamp.desc()),
        Index("idx_ts_timestamp", timestamp.desc()),
    )

    def __repr__(self):
        return f"<TSData station={self.station_id} time={self.timestamp}>"
