"""
PrithviNET Data Simulation Script
===================================
Populates PostgreSQL with realistic monitoring data:
  - 588 CPCB monitoring stations across India
  - 30 days of hourly time-series (~423,000 records)
  - Alerts from threshold violations
  - Demo users and prescribed limits

Run from backend/ directory:
    python -m scripts.simulate_data
"""

import sys
import time
import hashlib
import random
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import (
    create_engine, Column, BigInteger, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, UniqueConstraint, Index,
)
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func

# ---------------------------------------------------------------------------
# Database setup (standalone - no FastAPI dependency)
# ---------------------------------------------------------------------------

DATABASE_URL = "postgresql+psycopg://prithvinet:prithvinet123@localhost:5432/prithvinet"

engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=5, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# ORM Models (mirrors app/models/* exactly)
# ---------------------------------------------------------------------------


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"
    station_id = Column(String(10), primary_key=True)
    station_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone_type = Column(String(50), nullable=False)
    monitoring_capabilities = Column(String(255), nullable=False)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TimeSeriesData(Base):
    __tablename__ = "time_series_data"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    station_id = Column(String(10), ForeignKey("monitoring_stations.station_id"), nullable=False)
    aqi_pm25 = Column(Float, nullable=True)
    aqi_pm10 = Column(Float, nullable=True)
    aqi_so2 = Column(Float, nullable=True)
    aqi_no2 = Column(Float, nullable=True)
    aqi_co = Column(Float, nullable=True)
    aqi_o3 = Column(Float, nullable=True)
    water_ph = Column(Float, nullable=True)
    water_bod = Column(Float, nullable=True)
    water_cod = Column(Float, nullable=True)
    water_tss = Column(Float, nullable=True)
    water_flow = Column(Float, nullable=True)
    noise_leq = Column(Float, nullable=True)
    noise_lday = Column(Float, nullable=True)
    noise_lnight = Column(Float, nullable=True)
    weather_temp = Column(Float, nullable=True)
    weather_humidity = Column(Float, nullable=True)
    weather_pressure = Column(Float, nullable=True)
    weather_wind_speed = Column(Float, nullable=True)
    weather_wind_direction = Column(Float, nullable=True)
    __table_args__ = (
        UniqueConstraint("timestamp", "station_id", name="uq_ts_station"),
        Index("idx_ts_station_time", "station_id", timestamp.desc()),
        Index("idx_ts_timestamp", timestamp.desc()),
    )


class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(10), ForeignKey("monitoring_stations.station_id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    parameter = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False)
    category = Column(String(20), nullable=False)
    status = Column(String(20), default="Active")
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    __table_args__ = (
        Index("idx_alerts_station", "station_id", timestamp.desc()),
        Index("idx_alerts_status", "status"),
    )


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)
    region = Column(String(100), nullable=True)
    station_id = Column(String(10), ForeignKey("monitoring_stations.station_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PrescribedLimit(Base):
    __tablename__ = "prescribed_limits"
    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_type = Column(String(50), nullable=False)
    parameter = Column(String(50), nullable=False)
    category = Column(String(20), nullable=False)
    limit_value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)


# ---------------------------------------------------------------------------
# Password hashing (bcrypt via passlib, same as app)
# ---------------------------------------------------------------------------

try:
    import bcrypt

    def hash_password(pw: str) -> str:
        return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
except ImportError:
    try:
        from passlib.context import CryptContext
        _pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

        def hash_password(pw: str) -> str:
            return _pwd.hash(pw)
    except ImportError:
        def hash_password(pw: str) -> str:
            return "sha256:" + hashlib.sha256(pw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# CITY COORDINATES  (~310 Indian cities)
# ---------------------------------------------------------------------------

CITY_COORDS = {
    "Sri Vijaya Puram": (11.6234, 92.7265),
    "Amaravati": (16.5062, 80.6480),
    "Anantapur": (14.6819, 77.6006),
    "Chittoor": (13.2172, 79.1003),
    "Eluru": (16.7107, 81.0952),
    "Guntur": (16.3067, 80.4365),
    "Kadapa": (14.4674, 78.8241),
    "Machilipatnam": (16.1875, 81.1389),
    "Rajamahendravaram": (17.0005, 81.8040),
    "Tirumala": (13.6833, 79.3500),
    "Tirupati": (13.6288, 79.4192),
    "Vijayawada": (16.5062, 80.6480),
    "Visakhapatnam": (17.6868, 83.2185),
    "Naharlagun": (27.1044, 93.6953),
    "Byrnihat": (25.8560, 91.9000),
    "Guwahati": (26.1445, 91.7362),
    "Nagaon": (26.3500, 92.6840),
    "Nalbari": (26.4436, 91.4419),
    "Silchar": (24.8333, 92.7789),
    "Sivasagar": (26.9826, 94.6380),
    "Araria": (26.1517, 87.4625),
    "Aurangabad_Bihar": (24.7520, 84.3742),
    "Bettiah": (26.8014, 84.5170),
    "Bhagalpur": (25.2425, 86.9842),
    "Bihar Sharif": (25.1982, 85.5234),
    "Buxar": (25.5641, 83.9777),
    "Chhapra": (25.7804, 84.7467),
    "Darbhanga": (26.1542, 85.8918),
    "Gaya": (24.7955, 84.9994),
    "Hajipur": (25.6856, 85.2100),
    "Katihar": (25.5393, 87.5718),
    "Kishanganj": (26.0939, 87.9475),
    "Munger": (25.3708, 86.4735),
    "Muzaffarpur": (26.1209, 85.3647),
    "Nawada": (24.8862, 85.5396),
    "Patna": (25.6093, 85.1376),
    "Purnia": (25.7771, 87.4753),
    "Saharsa": (25.8835, 86.6003),
    "Samastipur": (25.8629, 85.7812),
    "Sasaram": (24.9469, 84.0311),
    "Siwan": (26.2224, 84.3573),
    "Begusarai": (25.4182, 86.1272),
    "Jehanabad": (25.2125, 84.9904),
    "Chandigarh": (30.7333, 76.7794),
    "Bhilai": (21.2094, 81.4285),
    "Bilaspur": (22.0796, 82.1391),
    "Korba": (22.3595, 82.7501),
    "Raipur": (21.2514, 81.6296),
    "Raigarh": (21.8974, 83.3950),
    "Durg": (21.1900, 81.2849),
    "Ambikapur": (23.1187, 83.1996),
    "Delhi": (28.6139, 77.2090),
    "Margao": (15.2832, 73.9862),
    "Panaji": (15.4909, 73.8278),
    "Vasco Da Gama": (15.3982, 73.8113),
    "Ahmedabad": (23.0225, 72.5714),
    "Ankleshwar": (21.6264, 73.0153),
    "Gandhinagar": (23.2156, 72.6369),
    "Junagadh": (21.5222, 70.4579),
    "Nandesari": (22.0226, 73.1014),
    "Rajkot": (22.3039, 70.8022),
    "Surat": (21.1702, 72.8311),
    "Vadodara": (22.3072, 73.1812),
    "Vapi": (20.3714, 72.9043),
    "Bhavnagar": (21.7645, 72.1519),
    "Morbi": (22.8120, 70.8370),
    "Jamnagar": (22.4707, 70.0577),
    "Ambala": (30.3782, 76.7767),
    "Ballabgarh": (28.3418, 77.3210),
    "Bahadurgarh": (28.6926, 76.9315),
    "Bhiwani": (28.7930, 76.1320),
    "Dharuhera": (28.2078, 76.7968),
    "Faridabad": (28.4089, 77.3178),
    "Fatehabad": (29.5135, 75.4559),
    "Gurugram": (28.4595, 77.0266),
    "Hisar": (29.1492, 75.7217),
    "Jind": (29.3161, 76.3152),
    "Kaithal": (29.8015, 76.3998),
    "Karnal": (29.6857, 76.9905),
    "Kurukshetra": (29.9695, 76.8783),
    "Mandikhera": (28.0000, 76.9500),
    "Manesar": (28.3524, 76.9415),
    "Narnaul": (28.0444, 76.1068),
    "Panchkula": (30.6942, 76.8606),
    "Panipat": (29.3909, 76.9635),
    "Palwal": (28.1487, 77.3320),
    "Rohtak": (28.8955, 76.6066),
    "Sonipat": (28.9931, 77.0151),
    "Sirsa": (29.5349, 75.0283),
    "Yamunanagar": (30.1290, 77.2674),
    "Rewari": (28.1970, 76.6194),
    "Charkhi Dadri": (28.5921, 76.2686),
    "Baddi": (30.9578, 76.7914),
    "Damtal": (32.0623, 76.2910),
    "Kala Amb": (30.5206, 77.2700),
    "Nalagarh": (31.0404, 76.7234),
    "Paonta Sahib": (30.4381, 77.6024),
    "Parwanoo": (30.8356, 76.9614),
    "Shimla": (31.1048, 77.1734),
    "Jammu": (32.7266, 74.8570),
    "Srinagar": (34.0837, 74.7973),
    "Dhanbad": (23.7957, 86.4304),
    "Jamshedpur": (22.8046, 86.2029),
    "Jorapokhar": (23.7120, 86.4200),
    "Ranchi": (23.3441, 85.3096),
    "Bokaro": (23.6693, 86.1511),
    "Hazaribag": (23.9921, 85.3637),
    "Ramgarh": (23.6350, 85.5614),
    "Bengaluru": (12.9716, 77.5946),
    "Chikkaballapur": (13.4354, 77.7315),
    "Davanagere": (14.4644, 75.9218),
    "Dharwad": (15.4589, 75.0078),
    "Gulbarga": (17.3297, 76.8343),
    "Hubballi": (15.3647, 75.1240),
    "Mysuru": (12.2958, 76.6394),
    "Raichur": (16.2120, 77.3439),
    "Ramanagara": (12.7159, 77.2810),
    "Vijayapura": (16.8302, 75.7100),
    "Yadgir": (16.7700, 77.1400),
    "Mangaluru": (12.9141, 74.8560),
    "Eloor": (10.0667, 76.2833),
    "Ernakulam": (9.9816, 76.2999),
    "Kannur": (11.8745, 75.3704),
    "Kochi": (9.9312, 76.2673),
    "Kollam": (8.8932, 76.6141),
    "Kozhikode": (11.2588, 75.7804),
    "Palakkad": (10.7867, 76.6548),
    "Pathanamthitta": (9.2648, 76.7870),
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Thrissur": (10.5276, 76.2144),
    "Alappuzha": (9.4981, 76.3388),
    "Kottayam": (9.5916, 76.5222),
    "Leh": (34.1526, 77.5771),
    "Bhopal": (23.2599, 77.4126),
    "Dewas": (22.9676, 76.0534),
    "Gwalior": (26.2183, 78.1828),
    "Indore": (22.7196, 75.8577),
    "Jabalpur": (23.1815, 79.9864),
    "Katni": (23.8337, 80.3933),
    "Maihar": (24.2620, 80.7610),
    "Mandideep": (23.0817, 77.5300),
    "Pithampur": (22.6078, 75.6920),
    "Ratlam": (23.3340, 75.0387),
    "Sagar": (23.8388, 78.7378),
    "Satna": (24.5711, 80.8322),
    "Singrauli": (24.1993, 82.6754),
    "Ujjain": (23.1765, 75.7885),
    "Damoh": (23.8368, 79.4421),
    "Achalpur": (21.2604, 77.5104),
    "Ahmednagar": (19.0948, 74.7480),
    "Akola": (20.7059, 77.0016),
    "Amravati": (20.9320, 77.7523),
    "Aurangabad": (19.8762, 75.3433),
    "Badlapur": (19.1675, 73.2613),
    "Chandrapur": (19.9615, 79.2961),
    "Jalgaon": (21.0077, 75.5626),
    "Kalyan": (19.2437, 73.1355),
    "Kolhapur": (16.7050, 74.2433),
    "Latur": (18.4088, 76.5604),
    "Nagpur": (21.1458, 79.0882),
    "Nanded": (19.1383, 77.3210),
    "Nashik": (19.9975, 73.7898),
    "Navi Mumbai": (19.0330, 73.0297),
    "Palghar": (19.6969, 72.7654),
    "Pimpri Chinchwad": (18.6298, 73.7997),
    "Pune": (18.5204, 73.8567),
    "Sangli": (16.8524, 74.5815),
    "Solapur": (17.6599, 75.9064),
    "Thane": (19.2183, 72.9781),
    "Ulhasnagar": (19.2215, 73.1645),
    "Mumbai": (19.0760, 72.8777),
    "Jalna": (19.8347, 75.8816),
    "Imphal": (24.8170, 93.9368),
    "Byrnihat_Meghalaya": (25.8560, 91.9000),
    "Shillong": (25.5788, 91.8933),
    "Aizawl": (23.7271, 92.7176),
    "Dimapur": (25.9042, 93.7272),
    "Kohima": (25.6751, 94.1086),
    "Angul": (20.8408, 85.1005),
    "Balasore": (21.4942, 86.9355),
    "Bhubaneswar": (20.2961, 85.8245),
    "Cuttack": (20.4625, 85.8830),
    "Rourkela": (22.2604, 84.8536),
    "Sambalpur": (21.4669, 83.9812),
    "Talcher": (20.9517, 85.2181),
    "Jharsuguda": (21.8554, 84.0062),
    "Kalinganagar": (20.9400, 85.7700),
    "Puducherry": (11.9416, 79.8083),
    "Amritsar": (31.6340, 74.8723),
    "Bathinda": (30.2110, 74.9455),
    "Gobindgarh": (30.6680, 76.2987),
    "Jalandhar": (31.3260, 75.5762),
    "Khanna": (30.6970, 76.2190),
    "Ludhiana": (30.9010, 75.8573),
    "Patiala": (30.3398, 76.3869),
    "Rupnagar": (30.9660, 76.5336),
    "Pathankot": (32.2754, 75.6529),
    "Sangrur": (30.2449, 75.8459),
    "Mohali": (30.7046, 76.7179),
    "Ajmer": (26.4499, 74.6399),
    "Alwar": (27.5530, 76.6346),
    "Bhiwadi": (28.2102, 76.8609),
    "Jaipur": (26.9124, 75.7873),
    "Jodhpur": (26.2389, 73.0243),
    "Kota": (25.2138, 75.8648),
    "Pali": (25.7711, 73.3234),
    "Udaipur": (24.5854, 73.7125),
    "Bikaner": (28.0229, 73.3119),
    "Sikar": (27.6094, 75.1399),
    "Sri Ganganagar": (29.9094, 73.8790),
    "Bharatpur": (27.2152, 77.4890),
    "Chittorgarh": (24.8887, 74.6269),
    "Gangtok": (27.3389, 88.6065),
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Salem": (11.6643, 78.1460),
    "Thoothukudi": (8.7642, 78.1348),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Tirunelveli": (8.7139, 77.7567),
    "Vellore": (12.9165, 79.1325),
    "Tirupur": (11.1085, 77.3411),
    "Erode": (11.3410, 77.7172),
    "Krishnagiri": (12.5186, 78.2138),
    "Adilabad": (19.6640, 78.5320),
    "Hyderabad": (17.3850, 78.4867),
    "Karimnagar": (18.4386, 79.1288),
    "Khammam": (17.2473, 80.1514),
    "Mancherial": (18.8677, 79.4417),
    "Nalgonda": (17.0575, 79.2690),
    "Nizamabad": (18.6725, 78.0941),
    "Patancheru": (17.5326, 78.2648),
    "Ramagundam": (18.7557, 79.4740),
    "Sangareddy": (17.6147, 78.0868),
    "Warangal": (17.9784, 79.5941),
    "Agartala": (23.8315, 91.2868),
    "Agra": (27.1767, 78.0081),
    "Amroha": (28.9031, 78.4673),
    "Anpara": (24.2050, 82.7734),
    "Ayodhya": (26.7922, 82.1998),
    "Baghpat": (28.9454, 77.2213),
    "Bareilly": (28.3670, 79.4304),
    "Bulandshahr": (28.4070, 77.8498),
    "Ghaziabad": (28.6692, 77.4538),
    "Gorakhpur": (26.7606, 83.3732),
    "Greater Noida": (28.4744, 77.5040),
    "Hapur": (28.7307, 77.7759),
    "Jhansi": (25.4484, 78.5685),
    "Kanpur": (26.4499, 80.3319),
    "Lucknow": (26.8467, 80.9462),
    "Mathura": (27.4924, 77.6737),
    "Meerut": (28.9845, 77.7064),
    "Moradabad": (28.8386, 78.7733),
    "Muzaffarnagar": (29.4727, 77.7085),
    "Noida": (28.5355, 77.3910),
    "Prayagraj": (25.4358, 81.8463),
    "Varanasi": (25.3176, 82.9739),
    "Vrindavan": (27.5759, 77.6836),
    "Sultanpur": (26.2648, 82.0727),
    "Rae Bareli": (26.2345, 81.2466),
    "Firozabad": (27.1591, 78.3957),
    "Sambhal": (28.5870, 78.5700),
    "Saharanpur": (29.9680, 77.5510),
    "Unnao": (26.5393, 80.4878),
    "Aligarh": (27.8974, 78.0880),
    "Jaunpur": (25.7464, 82.6836),
    "Etawah": (26.7859, 79.0230),
    "Banda": (25.4750, 80.3380),
    "Loni": (28.7325, 77.2891),
    "Shahjahanpur": (27.8816, 79.9110),
    "Sitapur": (27.5669, 80.6829),
    "Hardoi": (27.3954, 80.1313),
    "Fatehpur": (25.9301, 80.8131),
    "Pratapgarh": (25.8974, 81.9399),
    "Mirzapur": (25.1337, 82.5645),
    "Bhadohi": (25.3950, 82.5690),
    "Ballia": (25.7613, 84.1487),
    "Azamgarh": (26.0736, 83.1856),
    "Deoria": (26.5024, 83.7910),
    "Mainpuri": (27.2307, 79.0210),
    "Etah": (27.5558, 78.6676),
    "Hathras": (27.5965, 78.0518),
    "Farrukhabad": (27.3918, 79.5806),
    "Bagpat": (28.9454, 77.2213),
    "Rampur": (28.7930, 79.0280),
    "Dehradun": (30.3165, 78.0322),
    "Haridwar": (29.9457, 78.1642),
    "Kashipur": (29.2104, 78.9619),
    "Rishikesh": (30.0869, 78.2676),
    "Haldwani": (29.2183, 79.5130),
    "Rudrapur": (28.9776, 79.3999),
    "Asansol": (23.6889, 86.9661),
    "Barrackpore": (22.7666, 88.3683),
    "Durgapur": (23.5204, 87.3119),
    "Haldia": (22.0667, 88.0698),
    "Howrah": (22.5958, 88.2636),
    "Kolkata": (22.5726, 88.3639),
    "Siliguri": (26.7271, 88.3953),
    "Baruipur": (22.3548, 88.4320),
}


# ---------------------------------------------------------------------------
# STATION LIST  (state, city, station_name)  -- 588 stations
# ---------------------------------------------------------------------------

STATIONS = [
    # 1  Andaman and Nicobar (1)
    ("Andaman and Nicobar", "Sri Vijaya Puram", "Police Line, Sri Vijaya Puram - ANPCC"),
    # 2  Andhra Pradesh (16)
    ("Andhra Pradesh", "Amaravati", "Secretariat, Amaravati - APPCB"),
    ("Andhra Pradesh", "Anantapur", "Gulzarpet, Anantapur - APPCB"),
    ("Andhra Pradesh", "Chittoor", "Gangineni Cheruvu, Chittoor - APPCB"),
    ("Andhra Pradesh", "Eluru", "District Court, Eluru - APPCB"),
    ("Andhra Pradesh", "Guntur", "Rajendra Nagar North, Guntur - APPCB"),
    ("Andhra Pradesh", "Kadapa", "Yerramukkapalli, Kadapa - APPCB"),
    ("Andhra Pradesh", "Machilipatnam", "Srinivas Nagar Colony, Machilipatnam - APPCB"),
    ("Andhra Pradesh", "Rajamahendravaram", "Anand Kala Kshetram, Rajamahendravaram - APPCB"),
    ("Andhra Pradesh", "Tirumala", "Toll Gate, Tirumala - APPCB"),
    ("Andhra Pradesh", "Tirupati", "Vaikuntapuram, Tirupati - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "PWD Grounds, Vijayawada - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "Kanuru, Vijayawada - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "Rajiv Gandhi Park, Vijayawada - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "HB Colony, Vijayawada - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "Rajiv Nagar, Vijayawada - APPCB"),
    ("Andhra Pradesh", "Visakhapatnam", "GVM Corporation, Visakhapatnam - APPCB"),
    # 3  Arunachal Pradesh (1)
    ("Arunachal Pradesh", "Naharlagun", "Naharlagun - APPCB"),
    # 4  Assam (9)
    ("Assam", "Byrnihat", "Central Academy for SFS, Byrnihat - ASPCB"),
    ("Assam", "Guwahati", "Railway Colony, Guwahati - ASPCB"),
    ("Assam", "Guwahati", "Pan Bazaar, Guwahati - ASPCB"),
    ("Assam", "Guwahati", "IITG, Guwahati - ASPCB"),
    ("Assam", "Guwahati", "LGBI Airport, Guwahati - ASPCB"),
    ("Assam", "Nagaon", "Christianpatty, Nagaon - ASPCB"),
    ("Assam", "Nalbari", "Bata Chowk, Nalbari - ASPCB"),
    ("Assam", "Silchar", "Tarapur, Silchar - ASPCB"),
    ("Assam", "Sivasagar", "Girls College, Sivasagar - ASPCB"),
    # 5  Bihar (30)
    ("Bihar", "Araria", "Collectorate, Araria - BSPCB"),
    ("Bihar", "Aurangabad_Bihar", "Aungari, Aurangabad - BSPCB"),
    ("Bihar", "Bettiah", "Bettiah Court, Bettiah - BSPCB"),
    ("Bihar", "Bhagalpur", "Sabour, Bhagalpur - BSPCB"),
    ("Bihar", "Bihar Sharif", "Collectorate, Bihar Sharif - BSPCB"),
    ("Bihar", "Buxar", "Collectorate, Buxar - BSPCB"),
    ("Bihar", "Chhapra", "Revelganj, Chhapra - BSPCB"),
    ("Bihar", "Darbhanga", "Lal Bagh Fort, Darbhanga - BSPCB"),
    ("Bihar", "Gaya", "Collectorate, Gaya - BSPCB"),
    ("Bihar", "Gaya", "Magadh University, Gaya - BSPCB"),
    ("Bihar", "Hajipur", "Sabalpur, Hajipur - BSPCB"),
    ("Bihar", "Katihar", "Collectorate, Katihar - BSPCB"),
    ("Bihar", "Kishanganj", "Collectorate, Kishanganj - BSPCB"),
    ("Bihar", "Munger", "Jamalpur, Munger - BSPCB"),
    ("Bihar", "Muzaffarpur", "SRSM College, Muzaffarpur - BSPCB"),
    ("Bihar", "Muzaffarpur", "Buddha Colony, Muzaffarpur - BSPCB"),
    ("Bihar", "Nawada", "Collectorate, Nawada - BSPCB"),
    ("Bihar", "Patna", "IGSC Planetarium, Patna - BSPCB"),
    ("Bihar", "Patna", "Samanpura, Patna - BSPCB"),
    ("Bihar", "Patna", "DRM Office, Patna - BSPCB"),
    ("Bihar", "Patna", "Muradpur, Patna - BSPCB"),
    ("Bihar", "Patna", "Rajbanshi Nagar, Patna - BSPCB"),
    ("Bihar", "Patna", "Collectorate, Patna - BSPCB"),
    ("Bihar", "Purnia", "Papa Chowk, Purnia - BSPCB"),
    ("Bihar", "Saharsa", "Collectorate, Saharsa - BSPCB"),
    ("Bihar", "Samastipur", "Collectorate, Samastipur - BSPCB"),
    ("Bihar", "Sasaram", "Collectorate, Sasaram - BSPCB"),
    ("Bihar", "Siwan", "Mahatma Gandhi Chowk, Siwan - BSPCB"),
    ("Bihar", "Begusarai", "Collectorate, Begusarai - BSPCB"),
    ("Bihar", "Jehanabad", "Collectorate, Jehanabad - BSPCB"),
    # 6  Chandigarh (3)
    ("Chandigarh", "Chandigarh", "Sector-25, Chandigarh - CPCC"),
    ("Chandigarh", "Chandigarh", "Sector 22, Chandigarh - CPCC"),
    ("Chandigarh", "Chandigarh", "Sector-53, Chandigarh - CPCC"),
    # 7  Chhattisgarh (9)
    ("Chhattisgarh", "Bhilai", "Sector-6 Market, Bhilai - CSPCB"),
    ("Chhattisgarh", "Bilaspur", "USLAAS, Bilaspur - CSPCB"),
    ("Chhattisgarh", "Korba", "Banki Mongra, Korba - CSPCB"),
    ("Chhattisgarh", "Korba", "Darri, Korba - CSPCB"),
    ("Chhattisgarh", "Raipur", "Vidhan Sabha, Raipur - CSPCB"),
    ("Chhattisgarh", "Raipur", "HIG Colony, Raipur - CSPCB"),
    ("Chhattisgarh", "Raigarh", "Collectorate, Raigarh - CSPCB"),
    ("Chhattisgarh", "Durg", "Collectorate, Durg - CSPCB"),
    ("Chhattisgarh", "Ambikapur", "Collectorate, Ambikapur - CSPCB"),
    # 8  Delhi (47)
    ("Delhi", "Delhi", "Alipur, Delhi - DPCC"),
    ("Delhi", "Delhi", "Anand Vihar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Ashok Vihar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Aya Nagar, Delhi - IMD"),
    ("Delhi", "Delhi", "Bawana, Delhi - DPCC"),
    ("Delhi", "Delhi", "Burari Crossing, Delhi - IMD"),
    ("Delhi", "Delhi", "CRRI Mathura Road, Delhi - IMD"),
    ("Delhi", "Delhi", "DTU, Delhi - CPCB"),
    ("Delhi", "Delhi", "Dwarka Sector 8, Delhi - DPCC"),
    ("Delhi", "Delhi", "East Arjun Nagar, Delhi - CPCB"),
    ("Delhi", "Delhi", "IGI Airport T3, Delhi - IMD"),
    ("Delhi", "Delhi", "IHBAS, Delhi - CPCB"),
    ("Delhi", "Delhi", "ITO, Delhi - CPCB"),
    ("Delhi", "Delhi", "Jahangirpuri, Delhi - DPCC"),
    ("Delhi", "Delhi", "Jawaharlal Nehru Stadium, Delhi - DPCC"),
    ("Delhi", "Delhi", "Lodhi Road, Delhi - IMD"),
    ("Delhi", "Delhi", "Mandir Marg, Delhi - DPCC"),
    ("Delhi", "Delhi", "Mundka, Delhi - DPCC"),
    ("Delhi", "Delhi", "Najafgarh, Delhi - DPCC"),
    ("Delhi", "Delhi", "Narela, Delhi - DPCC"),
    ("Delhi", "Delhi", "Nehru Nagar, Delhi - DPCC"),
    ("Delhi", "Delhi", "North Campus DU, Delhi - IMD"),
    ("Delhi", "Delhi", "NSIT Dwarka, Delhi - CPCB"),
    ("Delhi", "Delhi", "Okhla Phase-2, Delhi - DPCC"),
    ("Delhi", "Delhi", "Patparganj, Delhi - DPCC"),
    ("Delhi", "Delhi", "Pusa, Delhi - IMD"),
    ("Delhi", "Delhi", "Pusa DPCC, Delhi - DPCC"),
    ("Delhi", "Delhi", "RK Puram, Delhi - DPCC"),
    ("Delhi", "Delhi", "Rohini, Delhi - DPCC"),
    ("Delhi", "Delhi", "Shadipur, Delhi - CPCB"),
    ("Delhi", "Delhi", "Sirifort, Delhi - CPCB"),
    ("Delhi", "Delhi", "Sonia Vihar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Sri Aurobindo Marg, Delhi - DPCC"),
    ("Delhi", "Delhi", "Vivek Vihar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Wazirpur, Delhi - DPCC"),
    ("Delhi", "Delhi", "Major Dhyan Chand National Stadium, Delhi - DPCC"),
    ("Delhi", "Delhi", "Lajpat Nagar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Satyawati College, Delhi - DPCC"),
    ("Delhi", "Delhi", "JLN Stadium, Delhi - DPCC"),
    ("Delhi", "Delhi", "Chandni Chowk, Delhi - DPCC"),
    ("Delhi", "Delhi", "Connaught Place, Delhi - DPCC"),
    ("Delhi", "Delhi", "Karol Bagh, Delhi - DPCC"),
    ("Delhi", "Delhi", "Mayapuri, Delhi - DPCC"),
    ("Delhi", "Delhi", "Naraina, Delhi - DPCC"),
    ("Delhi", "Delhi", "Punjabi Bagh, Delhi - DPCC"),
    ("Delhi", "Delhi", "Sarojini Nagar, Delhi - DPCC"),
    ("Delhi", "Delhi", "Dwarka Sector 23, Delhi - DPCC"),
    # 9  Goa (3)
    ("Goa", "Margao", "Margao, Goa - GSPCB"),
    ("Goa", "Panaji", "Panaji, Goa - GSPCB"),
    ("Goa", "Vasco Da Gama", "Vasco Da Gama, Goa - GSPCB"),
    # 10  Gujarat (18)
    ("Gujarat", "Ahmedabad", "Maninagar, Ahmedabad - GPCB"),
    ("Gujarat", "Ahmedabad", "Chandkheda, Ahmedabad - GPCB"),
    ("Gujarat", "Ahmedabad", "Paldi, Ahmedabad - GPCB"),
    ("Gujarat", "Ahmedabad", "Bopal, Ahmedabad - GPCB"),
    ("Gujarat", "Ahmedabad", "Satellite, Ahmedabad - GPCB"),
    ("Gujarat", "Ankleshwar", "GIDC, Ankleshwar - GPCB"),
    ("Gujarat", "Gandhinagar", "Sector 10, Gandhinagar - GPCB"),
    ("Gujarat", "Junagadh", "Junagadh Municipal Corp, Junagadh - GPCB"),
    ("Gujarat", "Nandesari", "GIDC, Nandesari - GPCB"),
    ("Gujarat", "Rajkot", "Mavdi, Rajkot - GPCB"),
    ("Gujarat", "Surat", "Pal, Surat - GPCB"),
    ("Gujarat", "Surat", "Varachha, Surat - GPCB"),
    ("Gujarat", "Vadodara", "Akota, Vadodara - GPCB"),
    ("Gujarat", "Vadodara", "Waghodia, Vadodara - GPCB"),
    ("Gujarat", "Vapi", "GIDC, Vapi - GPCB"),
    ("Gujarat", "Bhavnagar", "Chowk Bazaar, Bhavnagar - GPCB"),
    ("Gujarat", "Morbi", "Town Hall, Morbi - GPCB"),
    ("Gujarat", "Jamnagar", "Municipal Corp, Jamnagar - GPCB"),
    # 11  Haryana (28)
    ("Haryana", "Ambala", "Patti Mehar, Ambala - HSPCB"),
    ("Haryana", "Ballabgarh", "Sector 65, Ballabgarh - HSPCB"),
    ("Haryana", "Bahadurgarh", "Municipal Council, Bahadurgarh - HSPCB"),
    ("Haryana", "Bhiwani", "H.S. No.3, Bhiwani - HSPCB"),
    ("Haryana", "Dharuhera", "Municipal Council, Dharuhera - HSPCB"),
    ("Haryana", "Faridabad", "Sector 16A, Faridabad - HSPCB"),
    ("Haryana", "Faridabad", "New Industrial Town, Faridabad - HSPCB"),
    ("Haryana", "Fatehabad", "Huda Sector, Fatehabad - HSPCB"),
    ("Haryana", "Gurugram", "Sector 51, Gurugram - HSPCB"),
    ("Haryana", "Gurugram", "Vikas Sadan, Gurugram - HSPCB"),
    ("Haryana", "Gurugram", "Teri Gram, Gurugram - HSPCB"),
    ("Haryana", "Hisar", "Urban Estate-II, Hisar - HSPCB"),
    ("Haryana", "Jind", "Police Lines, Jind - HSPCB"),
    ("Haryana", "Kaithal", "DLF Colony, Kaithal - HSPCB"),
    ("Haryana", "Karnal", "Sector 12, Karnal - HSPCB"),
    ("Haryana", "Kurukshetra", "Sector 7, Kurukshetra - HSPCB"),
    ("Haryana", "Mandikhera", "Mandikhera, Haryana - HSPCB"),
    ("Haryana", "Manesar", "Sector 2 IMT, Manesar - HSPCB"),
    ("Haryana", "Narnaul", "Narnaul, Haryana - HSPCB"),
    ("Haryana", "Panchkula", "Sector 6, Panchkula - HSPCB"),
    ("Haryana", "Panipat", "Sector 29, Panipat - HSPCB"),
    ("Haryana", "Palwal", "Palwal, Haryana - HSPCB"),
    ("Haryana", "Rohtak", "MD University, Rohtak - HSPCB"),
    ("Haryana", "Sonipat", "Murthal, Sonipat - HSPCB"),
    ("Haryana", "Sirsa", "Sirsa, Haryana - HSPCB"),
    ("Haryana", "Yamunanagar", "Yamunanagar, Haryana - HSPCB"),
    ("Haryana", "Rewari", "Collectorate, Rewari - HSPCB"),
    ("Haryana", "Charkhi Dadri", "Collectorate, Charkhi Dadri - HSPCB"),
    # 12  Himachal Pradesh (7)
    ("Himachal Pradesh", "Baddi", "HPPCB Office, Baddi - HPPCB"),
    ("Himachal Pradesh", "Damtal", "Damtal, Himachal Pradesh - HPPCB"),
    ("Himachal Pradesh", "Kala Amb", "Kala Amb, Himachal Pradesh - HPPCB"),
    ("Himachal Pradesh", "Nalagarh", "Nalagarh, Himachal Pradesh - HPPCB"),
    ("Himachal Pradesh", "Paonta Sahib", "Paonta Sahib, Himachal Pradesh - HPPCB"),
    ("Himachal Pradesh", "Parwanoo", "Parwanoo, Himachal Pradesh - HPPCB"),
    ("Himachal Pradesh", "Shimla", "Ridge, Shimla - HPPCB"),
    # 13  Jammu and Kashmir (2)
    ("Jammu and Kashmir", "Jammu", "Bagh-e-Bahu, Jammu - JKSPCB"),
    ("Jammu and Kashmir", "Srinagar", "Rajbagh, Srinagar - JKSPCB"),
    # 14  Jharkhand (8)
    ("Jharkhand", "Dhanbad", "Saraidhela, Dhanbad - JSPCB"),
    ("Jharkhand", "Jamshedpur", "Tata Stadium, Jamshedpur - JSPCB"),
    ("Jharkhand", "Jorapokhar", "Jorapokhar, Dhanbad - JSPCB"),
    ("Jharkhand", "Ranchi", "Collectorate, Ranchi - JSPCB"),
    ("Jharkhand", "Ranchi", "Clark Town, Ranchi - JSPCB"),
    ("Jharkhand", "Bokaro", "City Centre, Bokaro - JSPCB"),
    ("Jharkhand", "Hazaribag", "Collectorate, Hazaribag - JSPCB"),
    ("Jharkhand", "Ramgarh", "Ramgarh, Jharkhand - JSPCB"),
    # 15  Karnataka (20)
    ("Karnataka", "Bengaluru", "BTM Layout, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "BWSSB, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "City Railway Station, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Hebbal, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Hombegowda Nagar, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Jayanagar, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Peenya, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Silk Board, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Saneguravahalli, Bengaluru - KSPCB"),
    ("Karnataka", "Chikkaballapur", "Chikkaballapur, Karnataka - KSPCB"),
    ("Karnataka", "Davanagere", "Collectorate, Davanagere - KSPCB"),
    ("Karnataka", "Dharwad", "Dharwad, Karnataka - KSPCB"),
    ("Karnataka", "Gulbarga", "Gulbarga, Karnataka - KSPCB"),
    ("Karnataka", "Hubballi", "Hubballi, Karnataka - KSPCB"),
    ("Karnataka", "Mysuru", "Hebbal 1st Stage, Mysuru - KSPCB"),
    ("Karnataka", "Raichur", "Raichur, Karnataka - KSPCB"),
    ("Karnataka", "Ramanagara", "Ramanagara, Karnataka - KSPCB"),
    ("Karnataka", "Vijayapura", "Vijayapura, Karnataka - KSPCB"),
    ("Karnataka", "Yadgir", "Yadgir, Karnataka - KSPCB"),
    ("Karnataka", "Mangaluru", "PVS Circle, Mangaluru - KSPCB"),
    # 16  Kerala (14)
    ("Kerala", "Eloor", "Eloor, Kerala - KSPCB_KL"),
    ("Kerala", "Ernakulam", "Collectorate, Ernakulam - KSPCB_KL"),
    ("Kerala", "Kannur", "Palayad, Kannur - KSPCB_KL"),
    ("Kerala", "Kochi", "Thavakkara, Kochi - KSPCB_KL"),
    ("Kerala", "Kochi", "Vyttila, Kochi - KSPCB_KL"),
    ("Kerala", "Kollam", "Polayathodu, Kollam - KSPCB_KL"),
    ("Kerala", "Kozhikode", "Palayam, Kozhikode - KSPCB_KL"),
    ("Kerala", "Palakkad", "Collectorate, Palakkad - KSPCB_KL"),
    ("Kerala", "Pathanamthitta", "Collectorate, Pathanamthitta - KSPCB_KL"),
    ("Kerala", "Thiruvananthapuram", "Plammoodu, Thiruvananthapuram - KSPCB_KL"),
    ("Kerala", "Thiruvananthapuram", "Kariavattom, Thiruvananthapuram - KSPCB_KL"),
    ("Kerala", "Thrissur", "Viyyur, Thrissur - KSPCB_KL"),
    ("Kerala", "Alappuzha", "Collectorate, Alappuzha - KSPCB_KL"),
    ("Kerala", "Kottayam", "Collectorate, Kottayam - KSPCB_KL"),
    # 17  Ladakh (1)
    ("Ladakh", "Leh", "Leh, Ladakh - LSPCB"),
    # 18  Madhya Pradesh (20)
    ("Madhya Pradesh", "Bhopal", "TT Nagar, Bhopal - MPPCB"),
    ("Madhya Pradesh", "Bhopal", "M P Nagar, Bhopal - MPPCB"),
    ("Madhya Pradesh", "Dewas", "Bhopal Chauraha, Dewas - MPPCB"),
    ("Madhya Pradesh", "Gwalior", "City Centre, Gwalior - MPPCB"),
    ("Madhya Pradesh", "Gwalior", "Phool Bagh, Gwalior - MPPCB"),
    ("Madhya Pradesh", "Indore", "Chhoti Gwaltoli, Indore - MPPCB"),
    ("Madhya Pradesh", "Indore", "Vijay Nagar, Indore - MPPCB"),
    ("Madhya Pradesh", "Jabalpur", "Marhatal, Jabalpur - MPPCB"),
    ("Madhya Pradesh", "Katni", "Katni, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Maihar", "Maihar, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Mandideep", "Mandideep Industrial, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Pithampur", "Pithampur Industrial, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Ratlam", "Ratlam, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Sagar", "Sagar, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Satna", "Satna, Madhya Pradesh - MPPCB"),
    ("Madhya Pradesh", "Singrauli", "Waidhan, Singrauli - MPPCB"),
    ("Madhya Pradesh", "Singrauli", "Vindhyanagar, Singrauli - MPPCB"),
    ("Madhya Pradesh", "Ujjain", "Mahakal Temple, Ujjain - MPPCB"),
    ("Madhya Pradesh", "Damoh", "Collectorate, Damoh - MPPCB"),
    ("Madhya Pradesh", "Sagar", "University, Sagar - MPPCB"),
    # 19  Maharashtra (45)
    ("Maharashtra", "Achalpur", "Achalpur, Maharashtra - MPCB"),
    ("Maharashtra", "Ahmednagar", "Ahmednagar, Maharashtra - MPCB"),
    ("Maharashtra", "Akola", "Akola, Maharashtra - MPCB"),
    ("Maharashtra", "Amravati", "Amravati, Maharashtra - MPCB"),
    ("Maharashtra", "Aurangabad", "Waluj, Aurangabad - MPCB"),
    ("Maharashtra", "Aurangabad", "Chikalthana, Aurangabad - MPCB"),
    ("Maharashtra", "Badlapur", "Badlapur, Maharashtra - MPCB"),
    ("Maharashtra", "Chandrapur", "Chandrapur, Maharashtra - MPCB"),
    ("Maharashtra", "Jalgaon", "Jalgaon, Maharashtra - MPCB"),
    ("Maharashtra", "Kalyan", "Kalyan, Maharashtra - MPCB"),
    ("Maharashtra", "Kolhapur", "Kolhapur, Maharashtra - MPCB"),
    ("Maharashtra", "Latur", "Latur, Maharashtra - MPCB"),
    ("Maharashtra", "Mumbai", "Bandra, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "BKC, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Chembur, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Colaba, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Kurla, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Khindipada Bhandup, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Malad, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Mazgaon, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Mulund, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Powai, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Sion, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Worli, Mumbai - MPCB"),
    ("Maharashtra", "Nagpur", "Civil Lines, Nagpur - MPCB"),
    ("Maharashtra", "Nagpur", "Sadar, Nagpur - MPCB"),
    ("Maharashtra", "Nanded", "Nanded, Maharashtra - MPCB"),
    ("Maharashtra", "Nashik", "Satpur, Nashik - MPCB"),
    ("Maharashtra", "Nashik", "Mumbai Naka, Nashik - MPCB"),
    ("Maharashtra", "Navi Mumbai", "Airoli, Navi Mumbai - MPCB"),
    ("Maharashtra", "Navi Mumbai", "Nerul, Navi Mumbai - MPCB"),
    ("Maharashtra", "Palghar", "Palghar, Maharashtra - MPCB"),
    ("Maharashtra", "Pimpri Chinchwad", "NIGDI, Pimpri Chinchwad - MPCB"),
    ("Maharashtra", "Pune", "Karve Road, Pune - MPCB"),
    ("Maharashtra", "Pune", "Shivajinagar, Pune - MPCB"),
    ("Maharashtra", "Pune", "Lohegaon, Pune - MPCB"),
    ("Maharashtra", "Pune", "Katraj, Pune - MPCB"),
    ("Maharashtra", "Pune", "Hadapsar, Pune - MPCB"),
    ("Maharashtra", "Sangli", "Sangli, Maharashtra - MPCB"),
    ("Maharashtra", "Solapur", "Solapur, Maharashtra - MPCB"),
    ("Maharashtra", "Thane", "Thane, Maharashtra - MPCB"),
    ("Maharashtra", "Ulhasnagar", "Ulhasnagar, Maharashtra - MPCB"),
    ("Maharashtra", "Jalna", "Jalna, Maharashtra - MPCB"),
    ("Maharashtra", "Chandrapur", "MIDC Chandrapur, Maharashtra - MPCB"),
    ("Maharashtra", "Nagpur", "MIDC Hingna, Nagpur - MPCB"),
    # 20  Manipur (2)
    ("Manipur", "Imphal", "D.M. College, Imphal - MPCB_MN"),
    ("Manipur", "Imphal", "Lamphelpat, Imphal - MPCB_MN"),
    # 21  Meghalaya (3)
    ("Meghalaya", "Byrnihat_Meghalaya", "EPIP, Byrnihat - MSPCB"),
    ("Meghalaya", "Shillong", "Lumpyngngad, Shillong - MSPCB"),
    ("Meghalaya", "Shillong", "Mawlai, Shillong - MSPCB"),
    # 22  Mizoram (1)
    ("Mizoram", "Aizawl", "Sikulpuikawn, Aizawl - MPCB_MZ"),
    # 23  Nagaland (2)
    ("Nagaland", "Dimapur", "DPHE Colony, Dimapur - NPCB"),
    ("Nagaland", "Kohima", "Nagaland Science Centre, Kohima - NPCB"),
    # 24  Odisha (12)
    ("Odisha", "Angul", "Talcher Coalfields, Angul - OSPCB"),
    ("Odisha", "Balasore", "Balasore, Odisha - OSPCB"),
    ("Odisha", "Bhubaneswar", "BMC Bhawani Mall, Bhubaneswar - OSPCB"),
    ("Odisha", "Bhubaneswar", "Mancheswar, Bhubaneswar - OSPCB"),
    ("Odisha", "Cuttack", "Stewarts School, Cuttack - OSPCB"),
    ("Odisha", "Rourkela", "Sector-13, Rourkela - OSPCB"),
    ("Odisha", "Sambalpur", "GM University, Sambalpur - OSPCB"),
    ("Odisha", "Talcher", "Talcher, Odisha - OSPCB"),
    ("Odisha", "Jharsuguda", "Collectorate, Jharsuguda - OSPCB"),
    ("Odisha", "Kalinganagar", "IDCO, Kalinganagar - OSPCB"),
    ("Odisha", "Bhubaneswar", "Patia, Bhubaneswar - OSPCB"),
    ("Odisha", "Cuttack", "Jagatpur, Cuttack - OSPCB"),
    # 25  Puducherry (2)
    ("Puducherry", "Puducherry", "JIPMER, Puducherry - PPCC"),
    ("Puducherry", "Puducherry", "Lawspet, Puducherry - PPCC"),
    # 26  Punjab (14)
    ("Punjab", "Amritsar", "Golden Temple, Amritsar - PPCB"),
    ("Punjab", "Amritsar", "Civil Line, Amritsar - PPCB"),
    ("Punjab", "Bathinda", "Bathinda, Punjab - PPCB"),
    ("Punjab", "Gobindgarh", "Focal Point, Gobindgarh - PPCB"),
    ("Punjab", "Jalandhar", "Civil Lines, Jalandhar - PPCB"),
    ("Punjab", "Jalandhar", "Model House, Jalandhar - PPCB"),
    ("Punjab", "Khanna", "Punjab Tractors, Khanna - PPCB"),
    ("Punjab", "Ludhiana", "Punjab Agricultural University, Ludhiana - PPCB"),
    ("Punjab", "Ludhiana", "Focal Point, Ludhiana - PPCB"),
    ("Punjab", "Patiala", "Model Town, Patiala - PPCB"),
    ("Punjab", "Rupnagar", "Rupnagar, Punjab - PPCB"),
    ("Punjab", "Pathankot", "Pathankot, Punjab - PPCB"),
    ("Punjab", "Sangrur", "Sangrur, Punjab - PPCB"),
    ("Punjab", "Mohali", "Phase VIII Industrial Area, Mohali - PPCB"),
    # 27  Rajasthan (16)
    ("Rajasthan", "Ajmer", "Civil Lines, Ajmer - RSPCB"),
    ("Rajasthan", "Alwar", "Moti Doongri, Alwar - RSPCB"),
    ("Rajasthan", "Bhiwadi", "RIICO Industrial Area, Bhiwadi - RSPCB"),
    ("Rajasthan", "Jaipur", "Adarsh Nagar, Jaipur - RSPCB"),
    ("Rajasthan", "Jaipur", "Police Commissionerate, Jaipur - RSPCB"),
    ("Rajasthan", "Jaipur", "Shastri Nagar, Jaipur - RSPCB"),
    ("Rajasthan", "Jaipur", "VKI Area, Jaipur - RSPCB"),
    ("Rajasthan", "Jodhpur", "Collectorate, Jodhpur - RSPCB"),
    ("Rajasthan", "Kota", "Nayapura, Kota - RSPCB"),
    ("Rajasthan", "Pali", "Pali, Rajasthan - RSPCB"),
    ("Rajasthan", "Udaipur", "Ashok Nagar, Udaipur - RSPCB"),
    ("Rajasthan", "Bikaner", "Bikaner, Rajasthan - RSPCB"),
    ("Rajasthan", "Sikar", "Sikar, Rajasthan - RSPCB"),
    ("Rajasthan", "Sri Ganganagar", "Sri Ganganagar, Rajasthan - RSPCB"),
    ("Rajasthan", "Bharatpur", "Bharatpur, Rajasthan - RSPCB"),
    ("Rajasthan", "Chittorgarh", "Chittorgarh, Rajasthan - RSPCB"),
    # 28  Sikkim (1)
    ("Sikkim", "Gangtok", "Deorali, Gangtok - SSPCB"),
    # 29  Tamil Nadu (16)
    ("Tamil Nadu", "Chennai", "Alandur Bus Depot, Chennai - TNPCB"),
    ("Tamil Nadu", "Chennai", "Manali, Chennai - TNPCB"),
    ("Tamil Nadu", "Chennai", "Manali Village, Chennai - TNPCB"),
    ("Tamil Nadu", "Chennai", "Perungudi, Chennai - TNPCB"),
    ("Tamil Nadu", "Chennai", "Velachery, Chennai - TNPCB"),
    ("Tamil Nadu", "Coimbatore", "SIDCO Kurichi, Coimbatore - TNPCB"),
    ("Tamil Nadu", "Coimbatore", "RS Puram, Coimbatore - TNPCB"),
    ("Tamil Nadu", "Madurai", "Thiruparankundram, Madurai - TNPCB"),
    ("Tamil Nadu", "Salem", "Collectorate, Salem - TNPCB"),
    ("Tamil Nadu", "Thoothukudi", "Thoothukudi, Tamil Nadu - TNPCB"),
    ("Tamil Nadu", "Tiruchirappalli", "Collectorate, Tiruchirappalli - TNPCB"),
    ("Tamil Nadu", "Tirunelveli", "Tirunelveli, Tamil Nadu - TNPCB"),
    ("Tamil Nadu", "Vellore", "Vellore, Tamil Nadu - TNPCB"),
    ("Tamil Nadu", "Tirupur", "SIPCOT, Tirupur - TNPCB"),
    ("Tamil Nadu", "Erode", "Collectorate, Erode - TNPCB"),
    ("Tamil Nadu", "Krishnagiri", "Collectorate, Krishnagiri - TNPCB"),
    # 30  Telangana (20)
    ("Telangana", "Adilabad", "Adilabad, Telangana - TSPCB"),
    ("Telangana", "Hyderabad", "Bollaram, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Central University, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "ECIL, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "ICRISAT, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "IDA Pashamylaram, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Jeedimetla, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Nacharam, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Sanathnagar, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Zoo Park, Hyderabad - TSPCB"),
    ("Telangana", "Karimnagar", "Karimnagar, Telangana - TSPCB"),
    ("Telangana", "Khammam", "Khammam, Telangana - TSPCB"),
    ("Telangana", "Mancherial", "Mancherial, Telangana - TSPCB"),
    ("Telangana", "Nalgonda", "Nalgonda, Telangana - TSPCB"),
    ("Telangana", "Nizamabad", "Nizamabad, Telangana - TSPCB"),
    ("Telangana", "Patancheru", "Patancheru, Telangana - TSPCB"),
    ("Telangana", "Ramagundam", "Ramagundam, Telangana - TSPCB"),
    ("Telangana", "Sangareddy", "Sangareddy, Telangana - TSPCB"),
    ("Telangana", "Warangal", "Warangal, Telangana - TSPCB"),
    ("Telangana", "Hyderabad", "Kokapet, Hyderabad - TSPCB"),
    # 31  Tripura (1)
    ("Tripura", "Agartala", "Agartala, Tripura - TSPCB_TR"),
    # 32  Uttar Pradesh (66)
    ("Uttar Pradesh", "Agra", "Sanjay Place, Agra - UPPCB"),
    ("Uttar Pradesh", "Agra", "Bodla, Agra - UPPCB"),
    ("Uttar Pradesh", "Amroha", "Amroha, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Anpara", "Anpara, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Ayodhya", "Ayodhya, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Baghpat", "Baghpat, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Bareilly", "Pilibhit Bypass, Bareilly - UPPCB"),
    ("Uttar Pradesh", "Bulandshahr", "Bulandshahr, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Ghaziabad", "Loni, Ghaziabad - UPPCB"),
    ("Uttar Pradesh", "Ghaziabad", "Vasundhara, Ghaziabad - UPPCB"),
    ("Uttar Pradesh", "Ghaziabad", "Sanjay Nagar, Ghaziabad - UPPCB"),
    ("Uttar Pradesh", "Ghaziabad", "Indirapuram, Ghaziabad - UPPCB"),
    ("Uttar Pradesh", "Gorakhpur", "Mundera Bazar, Gorakhpur - UPPCB"),
    ("Uttar Pradesh", "Greater Noida", "Knowledge Park-III, Greater Noida - UPPCB"),
    ("Uttar Pradesh", "Greater Noida", "Knowledge Park-V, Greater Noida - UPPCB"),
    ("Uttar Pradesh", "Hapur", "Hapur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Jhansi", "Jhansi, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Kanpur", "Nehru Nagar, Kanpur - UPPCB"),
    ("Uttar Pradesh", "Kanpur", "Kidwai Nagar, Kanpur - UPPCB"),
    ("Uttar Pradesh", "Lucknow", "Central School, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Lucknow", "Gomti Nagar, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Lucknow", "Lalbagh, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Lucknow", "Talkatora, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Lucknow", "Aliganj, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Mathura", "Vrindavan Chowk, Mathura - UPPCB"),
    ("Uttar Pradesh", "Meerut", "Pallavpuram, Meerut - UPPCB"),
    ("Uttar Pradesh", "Meerut", "Ganga Nagar, Meerut - UPPCB"),
    ("Uttar Pradesh", "Moradabad", "Lajpat Nagar, Moradabad - UPPCB"),
    ("Uttar Pradesh", "Muzaffarnagar", "New Mandi, Muzaffarnagar - UPPCB"),
    ("Uttar Pradesh", "Noida", "Sector-125, Noida - UPPCB"),
    ("Uttar Pradesh", "Noida", "Sector-62, Noida - UPPCB"),
    ("Uttar Pradesh", "Noida", "Sector-116, Noida - UPPCB"),
    ("Uttar Pradesh", "Noida", "Sector-1, Noida - UPPCB"),
    ("Uttar Pradesh", "Prayagraj", "Civil Lines, Prayagraj - UPPCB"),
    ("Uttar Pradesh", "Prayagraj", "Dhumanganj, Prayagraj - UPPCB"),
    ("Uttar Pradesh", "Varanasi", "Ardhali Bazar, Varanasi - UPPCB"),
    ("Uttar Pradesh", "Varanasi", "BHU, Varanasi - UPPCB"),
    ("Uttar Pradesh", "Varanasi", "Maldahiya, Varanasi - UPPCB"),
    ("Uttar Pradesh", "Vrindavan", "Vrindavan, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Sultanpur", "Sultanpur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Rae Bareli", "Rae Bareli, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Firozabad", "Firozabad, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Sambhal", "Sambhal, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Saharanpur", "Saharanpur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Unnao", "Unnao, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Aligarh", "Aligarh, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Jaunpur", "Jaunpur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Etawah", "Etawah, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Banda", "Banda, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Loni", "Loni, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Shahjahanpur", "Shahjahanpur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Sitapur", "Sitapur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Hardoi", "Hardoi, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Fatehpur", "Fatehpur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Pratapgarh", "Pratapgarh, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Mirzapur", "Mirzapur, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Bhadohi", "Bhadohi, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Ballia", "Ballia, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Azamgarh", "Azamgarh, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Deoria", "Deoria, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Mainpuri", "Mainpuri, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Etah", "Etah, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Hathras", "Hathras, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Farrukhabad", "Farrukhabad, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Bagpat", "Bagpat, Uttar Pradesh - UPPCB"),
    ("Uttar Pradesh", "Rampur", "Rampur, Uttar Pradesh - UPPCB"),
    # 33  Uttarakhand (8)
    ("Uttarakhand", "Dehradun", "ISBT, Dehradun - UKPCB"),
    ("Uttarakhand", "Dehradun", "GMS Road, Dehradun - UKPCB"),
    ("Uttarakhand", "Haridwar", "Laltarao Bridge, Haridwar - UKPCB"),
    ("Uttarakhand", "Haridwar", "Rishikesh, Haridwar - UKPCB"),
    ("Uttarakhand", "Kashipur", "Kashipur, Uttarakhand - UKPCB"),
    ("Uttarakhand", "Rishikesh", "Laxman Jhula, Rishikesh - UKPCB"),
    ("Uttarakhand", "Haldwani", "Haldwani, Uttarakhand - UKPCB"),
    ("Uttarakhand", "Rudrapur", "Rudrapur, Uttarakhand - UKPCB"),
    # 34  West Bengal (22)
    ("West Bengal", "Asansol", "Asansol Court Area, Asansol - WBPCB"),
    ("West Bengal", "Asansol", "Sindri, Asansol - WBPCB"),
    ("West Bengal", "Barrackpore", "Barrackpore, West Bengal - WBPCB"),
    ("West Bengal", "Durgapur", "Steel Plant, Durgapur - WBPCB"),
    ("West Bengal", "Durgapur", "City Centre, Durgapur - WBPCB"),
    ("West Bengal", "Haldia", "IOCL, Haldia - WBPCB"),
    ("West Bengal", "Howrah", "Padmapukur, Howrah - WBPCB"),
    ("West Bengal", "Howrah", "Belur Math, Howrah - WBPCB"),
    ("West Bengal", "Kolkata", "Ballygunge, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Bidhannagar, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Fort William, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Ghusuri, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Jadavpur, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Rabindra Bharati University, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Rabindra Sarobar, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Victoria, Kolkata - WBPCB"),
    ("West Bengal", "Siliguri", "Siliguri, West Bengal - WBPCB"),
    ("West Bengal", "Baruipur", "Baruipur, West Bengal - WBPCB"),
    ("West Bengal", "Kolkata", "Park Street, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "Salt Lake, Kolkata - WBPCB"),
    ("West Bengal", "Howrah", "Shibpur, Howrah - WBPCB"),
    ("West Bengal", "Haldia", "Durgachak, Haldia - WBPCB"),
]

# Pad to exactly 588 stations if we're short - add more real CPCB stations
_EXTRA_STATIONS = [
    ("Ladakh", "Leh", "Spituk, Leh - LSPCB"),
    ("Meghalaya", "Shillong", "Barik, Shillong - MSPCB"),
    ("Manipur", "Imphal", "Keisham, Imphal - MPCB_MN"),
    ("Mizoram", "Aizawl", "Durtlang, Aizawl - MPCB_MZ"),
    ("Nagaland", "Dimapur", "Chumukedima, Dimapur - NPCB"),
    ("Sikkim", "Gangtok", "Tadong, Gangtok - SSPCB"),
    ("Tripura", "Agartala", "Badharghat, Agartala - TSPCB_TR"),
    ("Goa", "Panaji", "Altinho, Panaji - GSPCB"),
    ("Gujarat", "Surat", "Hazira, Surat - GPCB"),
    ("Gujarat", "Rajkot", "Aji Industrial, Rajkot - GPCB"),
    ("Gujarat", "Ahmedabad", "Naroda, Ahmedabad - GPCB"),
    ("Gujarat", "Vadodara", "Tarsali, Vadodara - GPCB"),
    ("Haryana", "Gurugram", "Sector 51A, Gurugram - HSPCB"),
    ("Haryana", "Faridabad", "Sector 30, Faridabad - HSPCB"),
    ("Haryana", "Hisar", "Hisar II, Hisar - HSPCB"),
    ("Rajasthan", "Jaipur", "Mansarovar, Jaipur - RSPCB"),
    ("Rajasthan", "Jodhpur", "Ratanada, Jodhpur - RSPCB"),
    ("Rajasthan", "Kota", "Kota Industrial, Kota - RSPCB"),
    ("Tamil Nadu", "Chennai", "Anna Nagar, Chennai - TNPCB"),
    ("Tamil Nadu", "Chennai", "Kodungaiyur, Chennai - TNPCB"),
    ("Tamil Nadu", "Coimbatore", "Ganapathy, Coimbatore - TNPCB"),
    ("Tamil Nadu", "Madurai", "KK Nagar, Madurai - TNPCB"),
    ("Telangana", "Hyderabad", "Abids, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Uppal, Hyderabad - TSPCB"),
    ("Telangana", "Hyderabad", "Kukatpally, Hyderabad - TSPCB"),
    ("Uttar Pradesh", "Lucknow", "Charbagh, Lucknow - UPPCB"),
    ("Uttar Pradesh", "Kanpur", "Panki, Kanpur - UPPCB"),
    ("Uttar Pradesh", "Agra", "Dayalbagh, Agra - UPPCB"),
    ("Uttar Pradesh", "Varanasi", "Lanka, Varanasi - UPPCB"),
    ("Uttar Pradesh", "Noida", "Sector-50, Noida - UPPCB"),
    ("Uttar Pradesh", "Ghaziabad", "Raj Nagar, Ghaziabad - UPPCB"),
    ("Uttar Pradesh", "Meerut", "Shastri Nagar, Meerut - UPPCB"),
    ("West Bengal", "Kolkata", "Tollygunge, Kolkata - WBPCB"),
    ("West Bengal", "Kolkata", "New Town, Kolkata - WBPCB"),
    ("West Bengal", "Howrah", "Santragachi, Howrah - WBPCB"),
    ("West Bengal", "Durgapur", "Durgapur Industrial, Durgapur - WBPCB"),
    ("Karnataka", "Bengaluru", "Whitefield, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Electronic City, Bengaluru - KSPCB"),
    ("Karnataka", "Bengaluru", "Yeshwantpur, Bengaluru - KSPCB"),
    ("Kerala", "Kochi", "Fort Kochi, Kochi - KSPCB_KL"),
    ("Kerala", "Kozhikode", "Mavoor Road, Kozhikode - KSPCB_KL"),
    ("Maharashtra", "Mumbai", "Andheri, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Borivali, Mumbai - MPCB"),
    ("Maharashtra", "Mumbai", "Kandivali, Mumbai - MPCB"),
    ("Maharashtra", "Pune", "Bhosari, Pune - MPCB"),
    ("Maharashtra", "Pune", "Pashan, Pune - MPCB"),
    ("Maharashtra", "Navi Mumbai", "Vashi, Navi Mumbai - MPCB"),
    ("Maharashtra", "Nashik", "Gangapur Road, Nashik - MPCB"),
    ("Delhi", "Delhi", "Janakpuri, Delhi - DPCC"),
    ("Delhi", "Delhi", "Pitampura, Delhi - DPCC"),
    ("Delhi", "Delhi", "Greater Kailash, Delhi - DPCC"),
    ("Delhi", "Delhi", "Defence Colony, Delhi - DPCC"),
    ("Bihar", "Patna", "Khagaul, Patna - BSPCB"),
    ("Bihar", "Muzaffarpur", "Aghoria Bazar, Muzaffarpur - BSPCB"),
    ("Bihar", "Gaya", "Bodh Gaya, Gaya - BSPCB"),
    ("Madhya Pradesh", "Bhopal", "Arera Colony, Bhopal - MPPCB"),
    ("Madhya Pradesh", "Indore", "Rajwada, Indore - MPPCB"),
    ("Chhattisgarh", "Raipur", "Tatibandh, Raipur - CSPCB"),
    ("Chhattisgarh", "Bilaspur", "Mangla, Bilaspur - CSPCB"),
    ("Punjab", "Ludhiana", "Civil Lines, Ludhiana - PPCB"),
    ("Punjab", "Amritsar", "Ranjit Avenue, Amritsar - PPCB"),
    ("Odisha", "Bhubaneswar", "Nayapalli, Bhubaneswar - OSPCB"),
    ("Odisha", "Cuttack", "Bidanasi, Cuttack - OSPCB"),
    ("Jharkhand", "Ranchi", "Morabadi, Ranchi - JSPCB"),
    ("Jharkhand", "Jamshedpur", "Bistupur, Jamshedpur - JSPCB"),
    ("Andhra Pradesh", "Visakhapatnam", "MVP Colony, Visakhapatnam - APPCB"),
    ("Andhra Pradesh", "Vijayawada", "Benz Circle, Vijayawada - APPCB"),
    ("Himachal Pradesh", "Shimla", "Lakkar Bazaar, Shimla - HPPCB"),
    ("Uttarakhand", "Dehradun", "Rajpur Road, Dehradun - UKPCB"),
    ("Uttarakhand", "Haridwar", "BHEL, Haridwar - UKPCB"),
    ("Assam", "Guwahati", "Khanapara, Guwahati - ASPCB"),
    ("Assam", "Guwahati", "Dispur, Guwahati - ASPCB"),
]

# Add extras to reach 588
_needed = 588 - len(STATIONS)
if _needed > 0:
    STATIONS.extend(_EXTRA_STATIONS[:_needed])

# Trim if over 588
STATIONS = STATIONS[:588]


# ---------------------------------------------------------------------------
# ZONE TYPE assignment heuristics
# ---------------------------------------------------------------------------

_INDUSTRIAL_KW = [
    "gidc", "industrial", "imt", "focal point", "midc", "sipcot", "sidco",
    "riico", "idco", "mandideep", "pithampur", "ankleshwar", "nandesari",
    "vapi", "bhilai", "korba", "rourkela", "talcher", "jharsuguda",
    "kalinganagar", "haldia", "durgapur", "steel plant", "iocl",
    "waidhan", "vindhyanagar", "anpara", "peenya", "manesar", "epip",
    "jorapokhar", "darri", "banki mongra", "hazira", "gobindgarh",
    "panki", "bhel", "sector-6 market", "aji industrial", "durgapur industrial",
    "kota industrial",
]

_SILENCE_KW = [
    "hospital", "school", "college", "university", "temple", "church",
    "mosque", "court", "toll gate", "tirumala", "golden temple",
    "mahakal", "zoo park", "rabindra sarobar", "fort william", "victoria",
    "ridge", "deorali", "science centre", "planetarium", "jipmer",
    "belur math", "vrindavan", "laxman jhula", "bhu", "iitg", "icrisat",
    "central university", "tadong", "bodh gaya",
]

_COMMERCIAL_KW = [
    "market", "bazaar", "bazar", "chowk", "chowraha", "naka",
    "bus depot", "airport", "railway", "ito", "connaught", "chandni chowk",
    "karol bagh", "silk board", "station", "city centre", "sector 22",
    "pan bazaar", "chowk bazaar", "town hall", "maninagar",
    "collectorate", "secretariat", "vidhan sabha", "civil lines",
    "civil line", "municipal", "park street", "abids", "rajwada",
    "charbagh",
]


def classify_zone(name):
    low = name.lower()
    for kw in _INDUSTRIAL_KW:
        if kw in low:
            return "Industrial"
    for kw in _SILENCE_KW:
        if kw in low:
            return "Silence"
    for kw in _COMMERCIAL_KW:
        if kw in low:
            return "Commercial"
    return "Residential"


def assign_capabilities(zone, idx):
    if zone == "Industrial":
        return "AIR,WATER,NOISE,WEATHER"
    base = ["AIR", "WEATHER"]
    if zone == "Commercial":
        base.append("NOISE")
        if idx % 3 == 0:
            base.append("WATER")
    elif zone == "Residential":
        if idx % 4 == 0:
            base.append("NOISE")
        if idx % 5 == 0:
            base.append("WATER")
    elif zone == "Silence":
        base.append("NOISE")
    return ",".join(base)


# ---------------------------------------------------------------------------
# TIME-SERIES GENERATION
# ---------------------------------------------------------------------------

def generate_station_timeseries(station_id, zone, capabilities, lat, start_date, days=30, anomaly=False):
    records = []
    hours = days * 24
    caps = capabilities.split(",")

    base_pm25 = {"Industrial": 130, "Commercial": 85, "Residential": 55, "Silence": 35}[zone]
    lat_temp_offset = max(-8, min(4, (15 - lat) * 0.5))
    rw_state = 0.0

    anomaly_start = None
    anomaly_duration = 0
    if anomaly:
        anomaly_start = random.randint(100, hours - 50)
        anomaly_duration = random.randint(6, 24)

    for h in range(hours):
        ts = start_date + timedelta(hours=h)
        hour = ts.hour
        weekday = ts.weekday()

        in_anomaly = anomaly and anomaly_start <= h < (anomaly_start + anomaly_duration)
        anomaly_mult = random.uniform(2.0, 3.0) if in_anomaly else 1.0

        rec = {
            "timestamp": ts, "station_id": station_id,
            "aqi_pm25": None, "aqi_pm10": None, "aqi_so2": None,
            "aqi_no2": None, "aqi_co": None, "aqi_o3": None,
            "water_ph": None, "water_bod": None, "water_cod": None,
            "water_tss": None, "water_flow": None,
            "noise_leq": None, "noise_lday": None, "noise_lnight": None,
            "weather_temp": None, "weather_humidity": None,
            "weather_pressure": None, "weather_wind_speed": None,
            "weather_wind_direction": None,
        }

        if "AIR" in caps:
            diurnal = 0.0
            if 6 <= hour <= 11:
                diurnal += 15 * max(0, np.sin(np.pi * (hour - 6) / 6))
            if 17 <= hour <= 23:
                diurnal += 12 * max(0, np.sin(np.pi * (hour - 17) / 6))

            weekly = 1.1 if weekday < 5 else 0.85
            rw_state += np.random.normal(0, 1.5)
            rw_state = float(np.clip(rw_state, -30, 30))

            pm25 = max(5.0, (base_pm25 * weekly + diurnal + rw_state + np.random.normal(0, 8)) * anomaly_mult)
            pm10 = max(10.0, pm25 * 1.8 + np.random.normal(0, 15))
            so2 = max(1.0, base_pm25 * 0.3 + np.random.normal(0, 5))
            no2 = max(1.0, (base_pm25 * 0.5 + diurnal * 0.3 + np.random.normal(0, 8)) * anomaly_mult)
            co = max(0.1, (base_pm25 / 50) + np.random.normal(0, 0.3))
            o3 = max(1.0, 40 + 20 * np.sin(np.pi * (hour - 14) / 8) + np.random.normal(0, 10))

            rec["aqi_pm25"] = round(float(pm25), 2)
            rec["aqi_pm10"] = round(float(pm10), 2)
            rec["aqi_so2"] = round(float(so2), 2)
            rec["aqi_no2"] = round(float(no2), 2)
            rec["aqi_co"] = round(float(co), 2)
            rec["aqi_o3"] = round(float(o3), 2)

        if "WEATHER" in caps:
            temp = 28 + lat_temp_offset + 8 * np.sin(np.pi * (hour - 14) / 12) + np.random.normal(0, 1.5)
            humidity = max(20.0, min(95.0, 65 - 0.8 * (temp - 28) + np.random.normal(0, 5)))
            pressure = 1013 + np.random.normal(0, 2)
            wind_speed = max(0.1, float(np.random.exponential(2.5)))
            wind_dir = (180 + h * 2 + np.random.normal(0, 30)) % 360

            rec["weather_temp"] = round(float(temp), 1)
            rec["weather_humidity"] = round(float(humidity), 1)
            rec["weather_pressure"] = round(float(pressure), 1)
            rec["weather_wind_speed"] = round(float(wind_speed), 1)
            rec["weather_wind_direction"] = round(float(wind_dir), 1)

        if "NOISE" in caps:
            noise_base = {"Industrial": 68, "Commercial": 60, "Residential": 48, "Silence": 40}[zone]
            if 6 <= hour <= 22:
                traffic_bump = 0.0
                if 7 <= hour <= 10:
                    traffic_bump += 8 * max(0, np.sin(np.pi * (hour - 7) / 4))
                if 16 <= hour <= 21:
                    traffic_bump += 6 * max(0, np.sin(np.pi * (hour - 16) / 5))
                rec["noise_lday"] = round(float(noise_base + traffic_bump + np.random.normal(0, 3)), 1)
                rec["noise_lnight"] = None
            else:
                rec["noise_lday"] = None
                rec["noise_lnight"] = round(float(noise_base - 12 + np.random.normal(0, 2)), 1)
            rec["noise_leq"] = round(float(noise_base + np.random.normal(0, 3)), 1)

        if "WATER" in caps:
            water_ph = float(np.clip(np.random.normal(7.2 if zone != "Industrial" else 6.5, 0.4), 4.0, 10.0))
            bod_base = {"Industrial": 25, "Commercial": 15, "Residential": 8, "Silence": 5}[zone]
            tss_base = {"Industrial": 80, "Commercial": 50, "Residential": 30, "Silence": 20}[zone]
            water_bod = max(1.0, bod_base + np.random.normal(0, 5))
            water_cod = max(2.0, water_bod * 2.5 + np.random.normal(0, 10))
            water_tss = max(5.0, tss_base + np.random.normal(0, 15))
            water_flow = max(0.1, float(np.random.exponential(2)))

            rec["water_ph"] = round(float(water_ph), 2)
            rec["water_bod"] = round(float(water_bod), 2)
            rec["water_cod"] = round(float(water_cod), 2)
            rec["water_tss"] = round(float(water_tss), 2)
            rec["water_flow"] = round(float(water_flow), 2)

        records.append(rec)

    return records


# ---------------------------------------------------------------------------
# ALERT GENERATION
# ---------------------------------------------------------------------------

ALERT_THRESHOLDS = {
    "aqi_pm25":    (60.0, 120.0, 250.0, "AIR"),
    "aqi_pm10":    (100.0, 250.0, 430.0, "AIR"),
    "aqi_so2":     (40.0, 80.0, 380.0, "AIR"),
    "aqi_no2":     (40.0, 80.0, 180.0, "AIR"),
    "aqi_co":      (2.0, 4.0, 10.0, "AIR"),
    "aqi_o3":      (50.0, 100.0, 168.0, "AIR"),
    "water_ph":    (9.0, 9.5, 10.0, "WATER"),
    "water_bod":   (10.0, 20.0, 30.0, "WATER"),
    "water_cod":   (40.0, 80.0, 120.0, "WATER"),
    "water_tss":   (50.0, 100.0, 150.0, "WATER"),
    "noise_lday":  (55.0, 65.0, 75.0, "NOISE"),
    "noise_lnight": (45.0, 55.0, 65.0, "NOISE"),
}


def generate_alerts(ts_records):
    alerts = []
    for rec in ts_records:
        for param, (warn, crit, haz, cat) in ALERT_THRESHOLDS.items():
            val = rec.get(param)
            if val is None:
                continue
            severity = None
            threshold = None
            if val >= haz:
                severity = "Hazardous"
                threshold = haz
            elif val >= crit:
                severity = "Critical"
                threshold = crit
            elif val >= warn:
                severity = "Warning"
                threshold = warn
            if severity:
                alerts.append({
                    "station_id": rec["station_id"],
                    "timestamp": rec["timestamp"],
                    "parameter": param,
                    "value": round(val, 2),
                    "threshold": threshold,
                    "severity": severity,
                    "category": cat,
                    "status": random.choice(["Active", "Active", "Active", "Acknowledged"]),
                })
    return alerts


# ---------------------------------------------------------------------------
# PRESCRIBED LIMITS (CPCB / NAAQS)
# ---------------------------------------------------------------------------

PRESCRIBED_LIMITS = []
for _zone in ["Industrial", "Commercial", "Residential", "Silence"]:
    PRESCRIBED_LIMITS.extend([
        {"zone_type": _zone, "parameter": "aqi_pm25", "category": "AIR", "limit_value": 60.0, "unit": "ug/m3", "description": "PM2.5 24-hr avg NAAQS limit"},
        {"zone_type": _zone, "parameter": "aqi_pm10", "category": "AIR", "limit_value": 100.0, "unit": "ug/m3", "description": "PM10 24-hr avg NAAQS limit"},
        {"zone_type": _zone, "parameter": "aqi_so2", "category": "AIR", "limit_value": 80.0, "unit": "ug/m3", "description": "SO2 24-hr avg NAAQS limit"},
        {"zone_type": _zone, "parameter": "aqi_no2", "category": "AIR", "limit_value": 80.0, "unit": "ug/m3", "description": "NO2 24-hr avg NAAQS limit"},
        {"zone_type": _zone, "parameter": "aqi_co", "category": "AIR", "limit_value": 4.0, "unit": "mg/m3", "description": "CO 8-hr avg NAAQS limit"},
        {"zone_type": _zone, "parameter": "aqi_o3", "category": "AIR", "limit_value": 100.0, "unit": "ug/m3", "description": "O3 8-hr avg NAAQS limit"},
    ])
    _bod_limit = {"Industrial": 30.0, "Commercial": 20.0, "Residential": 10.0, "Silence": 10.0}[_zone]
    _cod_limit = {"Industrial": 100.0, "Commercial": 60.0, "Residential": 40.0, "Silence": 40.0}[_zone]
    _tss_limit = {"Industrial": 100.0, "Commercial": 75.0, "Residential": 50.0, "Silence": 50.0}[_zone]
    PRESCRIBED_LIMITS.extend([
        {"zone_type": _zone, "parameter": "water_ph", "category": "WATER", "limit_value": 8.5, "unit": "pH", "description": "pH upper limit for discharge"},
        {"zone_type": _zone, "parameter": "water_bod", "category": "WATER", "limit_value": _bod_limit, "unit": "mg/L", "description": "BOD limit"},
        {"zone_type": _zone, "parameter": "water_cod", "category": "WATER", "limit_value": _cod_limit, "unit": "mg/L", "description": "COD limit"},
        {"zone_type": _zone, "parameter": "water_tss", "category": "WATER", "limit_value": _tss_limit, "unit": "mg/L", "description": "TSS limit"},
    ])
    _noise_day = {"Industrial": 75.0, "Commercial": 65.0, "Residential": 55.0, "Silence": 50.0}[_zone]
    _noise_night = {"Industrial": 70.0, "Commercial": 55.0, "Residential": 45.0, "Silence": 40.0}[_zone]
    PRESCRIBED_LIMITS.extend([
        {"zone_type": _zone, "parameter": "noise_lday", "category": "NOISE", "limit_value": _noise_day, "unit": "dB", "description": f"Daytime noise limit ({_zone} zone)"},
        {"zone_type": _zone, "parameter": "noise_lnight", "category": "NOISE", "limit_value": _noise_night, "unit": "dB", "description": f"Nighttime noise limit ({_zone} zone)"},
    ])


# ---------------------------------------------------------------------------
# SEED USERS
# ---------------------------------------------------------------------------

SEED_USERS = [
    ("Admin User", "admin@prithvinet.gov.in", "admin123", "SuperAdmin", None, None),
    ("Delhi Regional Officer", "officer@delhi.gov.in", "officer123", "RegionalOfficer", "Delhi", None),
    ("Monitoring Team Lead", "monitor@cpcb.gov.in", "monitor123", "MonitoringTeam", None, None),
    ("Industry Manager", "industry@factory.com", "industry123", "IndustryUser", "Delhi", "ST080"),
    ("Public Citizen", "citizen@gmail.com", "citizen123", "Citizen", None, None),
]


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    t0 = time.time()
    print("=" * 64)
    print("  PrithviNET Data Simulation Script")
    print("=" * 64)
    print(f"\nConnecting to: {DATABASE_URL}")
    print(f"Total stations to seed: {len(STATIONS)}")

    # 1. Drop and recreate tables
    print("\n[1/7] Dropping and recreating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("       Tables created.")

    session = SessionLocal()

    try:
        # 2. Build and insert stations
        print(f"\n[2/7] Inserting {len(STATIONS)} monitoring stations...")
        station_rows = []
        missing_cities = set()

        for idx, (state, city, name) in enumerate(STATIONS):
            station_id = f"ST{idx + 1:03d}"
            coords = CITY_COORDS.get(city)
            if coords is None:
                missing_cities.add(city)
                coords = (22.0, 78.0)

            lat, lng = coords
            lat += random.uniform(-0.02, 0.02)
            lng += random.uniform(-0.02, 0.02)

            zone = classify_zone(name)
            caps = assign_capabilities(zone, idx)

            display_city = city.replace("_Bihar", "").replace("_Meghalaya", "")
            station_rows.append({
                "station_id": station_id,
                "station_name": name,
                "city": display_city,
                "state": state,
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "zone_type": zone,
                "monitoring_capabilities": caps,
                "status": "Active",
            })

        if missing_cities:
            print(f"       WARNING: {len(missing_cities)} cities without coords (using fallback): {sorted(missing_cities)[:10]}...")

        session.execute(MonitoringStation.__table__.insert(), station_rows)
        session.commit()
        print(f"       Inserted {len(station_rows)} stations.")

        # Zone distribution
        zone_counts = {}
        for s in station_rows:
            zone_counts[s["zone_type"]] = zone_counts.get(s["zone_type"], 0) + 1
        print(f"       Zone distribution: {zone_counts}")

        # 3. Generate time-series data
        days = 30
        total_expected = len(station_rows) * days * 24
        print(f"\n[3/7] Generating time-series: {len(station_rows)} stations x {days}d x 24h = {total_expected:,} records")

        start_date = datetime(2026, 2, 9, 0, 0, 0, tzinfo=timezone.utc)

        anomaly_count = max(1, len(station_rows) // 20)
        anomaly_ids = set(random.sample(range(len(station_rows)), anomaly_count))
        print(f"       Anomaly injection: {anomaly_count} stations (~5%)")

        batch_buffer = []
        batch_size = 10000
        inserted_count = 0

        for i, srow in enumerate(station_rows):
            ts_records = generate_station_timeseries(
                station_id=srow["station_id"],
                zone=srow["zone_type"],
                capabilities=srow["monitoring_capabilities"],
                lat=srow["latitude"],
                start_date=start_date,
                days=days,
                anomaly=(i in anomaly_ids),
            )
            batch_buffer.extend(ts_records)

            while len(batch_buffer) >= batch_size:
                batch = batch_buffer[:batch_size]
                batch_buffer = batch_buffer[batch_size:]
                session.execute(TimeSeriesData.__table__.insert(), batch)
                session.commit()
                inserted_count += len(batch)

            if (i + 1) % 50 == 0 or (i + 1) == len(station_rows):
                pct = (i + 1) / len(station_rows) * 100
                elapsed = time.time() - t0
                print(f"       [{i+1:>3}/{len(station_rows)}] {pct:5.1f}% | {inserted_count + len(batch_buffer):>7,} records | {elapsed:.0f}s")

        if batch_buffer:
            session.execute(TimeSeriesData.__table__.insert(), batch_buffer)
            session.commit()
            inserted_count += len(batch_buffer)
            batch_buffer = []

        print(f"       Total time-series inserted: {inserted_count:,}")

        # 4. Generate alerts
        print(f"\n[4/7] Scanning for threshold violations...")
        total_alerts = 0
        alert_buffer = []

        for i, srow in enumerate(station_rows):
            result = session.execute(
                TimeSeriesData.__table__.select().where(
                    TimeSeriesData.__table__.c.station_id == srow["station_id"]
                )
            )
            rows = result.fetchall()
            cols = list(result.keys())
            station_ts = [dict(zip(cols, row)) for row in rows]

            alerts = generate_alerts(station_ts)
            if len(alerts) > 50:
                alerts = random.sample(alerts, 50)

            alert_buffer.extend(alerts)
            total_alerts += len(alerts)

            while len(alert_buffer) >= 5000:
                batch = alert_buffer[:5000]
                alert_buffer = alert_buffer[5000:]
                session.execute(Alert.__table__.insert(), batch)
                session.commit()

            if (i + 1) % 100 == 0 or (i + 1) == len(station_rows):
                print(f"       [{i+1:>3}/{len(station_rows)}] alerts: {total_alerts:,}")

        if alert_buffer:
            session.execute(Alert.__table__.insert(), alert_buffer)
            session.commit()

        print(f"       Total alerts inserted: {total_alerts:,}")

        # 5. Seed prescribed limits
        print(f"\n[5/7] Seeding prescribed limits ({len(PRESCRIBED_LIMITS)} records)...")
        session.execute(PrescribedLimit.__table__.insert(), PRESCRIBED_LIMITS)
        session.commit()
        print(f"       Done.")

        # 6. Seed users
        print(f"\n[6/7] Seeding {len(SEED_USERS)} demo users...")
        user_rows = []
        for name, email, pw, role, region, sid in SEED_USERS:
            user_rows.append({
                "name": name,
                "email": email,
                "password_hash": hash_password(pw),
                "role": role,
                "region": region,
                "station_id": sid,
                "is_active": True,
            })
        session.execute(User.__table__.insert(), user_rows)
        session.commit()
        print(f"       Done.")

        # 7. Summary
        elapsed = time.time() - t0
        print(f"\n[7/7] SUMMARY")
        print(f"  Stations:           {len(station_rows):>10,}")
        print(f"  Time-series rows:   {inserted_count:>10,}")
        print(f"  Alerts:             {total_alerts:>10,}")
        print(f"  Prescribed limits:  {len(PRESCRIBED_LIMITS):>10}")
        print(f"  Users:              {len(user_rows):>10}")
        print(f"  Elapsed:            {elapsed:>10.1f}s")
        print("\n" + "=" * 64)
        print("  Data simulation complete!")
        print("=" * 64)

    except Exception as e:
        session.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
