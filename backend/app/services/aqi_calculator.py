"""
AQI Calculator based on Indian National Air Quality Index (NAQI) standards.
Computes sub-indices for each pollutant and returns the maximum as the overall AQI.
"""

# CPCB AQI Breakpoints: (C_low, C_high, I_low, I_high)
# Categories: Good(0-50), Satisfactory(51-100), Moderate(101-200), Poor(201-300), Very Poor(301-400), Severe(401-500)
BREAKPOINTS = {
    "pm25": [  # 24-hr avg, ug/m3
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500),
    ],
    "pm10": [  # 24-hr avg, ug/m3
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 600, 401, 500),
    ],
    "so2": [  # 24-hr avg, ug/m3
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, 2400, 401, 500),
    ],
    "no2": [  # 24-hr avg, ug/m3
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 600, 401, 500),
    ],
    "co": [  # 8-hr avg, mg/m3
        (0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10, 101, 200),
        (10.1, 17, 201, 300),
        (17.1, 34, 301, 400),
        (34.1, 50, 401, 500),
    ],
    "o3": [  # 8-hr avg, ug/m3
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (749, 1000, 401, 500),
    ],
}

AQI_CATEGORIES = [
    (50, "Good", "#009966"),
    (100, "Satisfactory", "#58bc2b"),
    (200, "Moderate", "#caac00"),
    (300, "Poor", "#ff5722"),
    (400, "Very Poor", "#960032"),
    (500, "Severe", "#7e0023"),
]

# Prescribed limits per zone type
NOISE_LIMITS = {
    "Industrial": {"day": 75, "night": 70},
    "Commercial": {"day": 65, "night": 55},
    "Residential": {"day": 55, "night": 45},
    "Silence": {"day": 50, "night": 40},
}

WATER_LIMITS = {
    "ph": {"min": 5.5, "max": 9.0},
    "bod": {"max": 30},  # mg/L
    "cod": {"max": 250},  # mg/L
    "tss": {"max": 100},  # mg/L
}


def _calc_sub_index(concentration: float, breakpoints: list[tuple]) -> float | None:
    """Calculate AQI sub-index for a single pollutant."""
    if concentration < 0:
        return None
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= concentration <= c_high:
            return ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
    # Beyond last breakpoint
    return 500


def calculate_aqi(
    pm25: float | None = None,
    pm10: float | None = None,
    so2: float | None = None,
    no2: float | None = None,
    co: float | None = None,
    o3: float | None = None,
) -> dict:
    """
    Calculate India AQI from sub-pollutant concentrations.
    Returns: { aqi: float, category: str, color: str, prominent_pollutant: str, sub_indices: dict }
    """
    sub_indices = {}
    pollutant_map = {
        "pm25": (pm25, "PM2.5"),
        "pm10": (pm10, "PM10"),
        "so2": (so2, "SO2"),
        "no2": (no2, "NO2"),
        "co": (co, "CO"),
        "o3": (o3, "O3"),
    }

    for key, (value, label) in pollutant_map.items():
        if value is not None and value >= 0:
            idx = _calc_sub_index(value, BREAKPOINTS[key])
            if idx is not None:
                sub_indices[label] = round(idx)

    if not sub_indices:
        return {"aqi": None, "category": "Insufficient Data", "color": "#cccccc", "prominent_pollutant": None, "sub_indices": {}}

    aqi = max(sub_indices.values())
    prominent = max(sub_indices, key=sub_indices.get)

    category = "Severe"
    color = "#7e0023"
    for threshold, cat, col in AQI_CATEGORIES:
        if aqi <= threshold:
            category = cat
            color = col
            break

    return {
        "aqi": round(aqi),
        "category": category,
        "color": color,
        "prominent_pollutant": prominent,
        "sub_indices": sub_indices,
    }


def get_aqi_category(aqi: float | None) -> tuple[str, str]:
    """Return (category, color) for an AQI value."""
    if aqi is None:
        return "Insufficient Data", "#cccccc"
    for threshold, cat, col in AQI_CATEGORIES:
        if aqi <= threshold:
            return cat, col
    return "Severe", "#7e0023"
