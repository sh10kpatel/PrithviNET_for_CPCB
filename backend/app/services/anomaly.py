"""
Anomaly detection service using Isolation Forest.
Detects unusual environmental readings across all parameters.
"""

import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.models.timeseries import TimeSeriesData

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    "aqi_pm25", "aqi_pm10", "aqi_so2", "aqi_no2", "aqi_co", "aqi_o3",
    "water_ph", "water_bod", "water_cod", "water_tss",
    "noise_leq", "noise_lday", "noise_lnight",
    "weather_temp", "weather_humidity", "weather_pressure", "weather_wind_speed",
]


def detect_anomalies(
    db: Session,
    station_id: str,
    lookback_hours: int = 168,
) -> dict:
    """
    Detect anomalous readings for a station using Isolation Forest.
    Returns list of anomalous timestamps with flagged parameters.
    """
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=lookback_hours)

    rows = (
        db.query(TimeSeriesData)
        .filter(
            TimeSeriesData.station_id == station_id,
            TimeSeriesData.timestamp >= start_time,
            TimeSeriesData.timestamp <= end_time,
        )
        .order_by(TimeSeriesData.timestamp)
        .all()
    )

    if len(rows) < 24:
        return {"station_id": station_id, "anomalies": [], "total": 0}

    # Build feature matrix
    data = []
    timestamps = []
    for row in rows:
        features = {}
        for col in FEATURE_COLUMNS:
            val = getattr(row, col, None)
            features[col] = val if val is not None else np.nan
        data.append(features)
        timestamps.append(row.timestamp)

    df = pd.DataFrame(data, index=timestamps)

    # Drop columns that are entirely NaN
    df = df.dropna(axis=1, how="all")
    if df.shape[1] < 2:
        return {"station_id": station_id, "anomalies": [], "total": 0}

    # Fill remaining NaN with column mean
    df = df.fillna(df.mean())

    try:
        from sklearn.ensemble import IsolationForest

        model = IsolationForest(
            contamination=0.05,
            random_state=42,
            n_estimators=100,
        )
        predictions = model.fit_predict(df.values)

        # Find anomalous records
        anomalies = []
        means = df.mean()
        stds = df.std()
        stds = stds.replace(0, 1)  # Avoid division by zero

        for i, pred in enumerate(predictions):
            if pred == -1:  # Anomaly
                ts = timestamps[i]
                row_data = df.iloc[i]

                # Identify which parameters are unusual (Z-score > 2)
                z_scores = ((row_data - means) / stds).abs()
                flagged = z_scores[z_scores > 2.0].index.tolist()

                anomaly_record = {
                    "timestamp": ts.isoformat(),
                    "flagged_parameters": flagged,
                    "severity": "High" if any(z_scores[f] > 3.0 for f in flagged if f in z_scores.index) else "Medium",
                    "values": {col: round(row_data[col], 2) for col in flagged if col in row_data.index},
                }
                anomalies.append(anomaly_record)

        return {
            "station_id": station_id,
            "anomalies": anomalies,
            "total": len(anomalies),
            "lookback_hours": lookback_hours,
        }

    except Exception as e:
        logger.warning(f"Anomaly detection failed for {station_id}: {e}")
        return {"station_id": station_id, "anomalies": [], "total": 0, "error": str(e)}
