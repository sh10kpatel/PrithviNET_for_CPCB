"""Prophet + ARIMA forecasting models for environmental time series."""

import sqlite3
from datetime import timedelta

import numpy as np
import pandas as pd
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA

from app.config import settings


def get_historical_readings(
    location_id: int,
    parameter_id: int,
    days: int = 30,
) -> pd.DataFrame:
    """Fetch historical readings from SQLite for model training.

    Args:
        location_id: Monitoring location ID.
        parameter_id: Environmental parameter ID.
        days: Number of days of history to fetch.

    Returns:
        DataFrame with 'ds' (datetime) and 'y' (value) columns.
    """
    conn = sqlite3.connect(settings.db_absolute_path)
    query = """
        SELECT timestamp AS ds, value AS y
        FROM readings
        WHERE location_id = ? AND parameter_id = ?
          AND timestamp >= datetime('now', ?)
        ORDER BY timestamp ASC
    """
    df = pd.read_sql_query(
        query, conn, params=[location_id, parameter_id, f"-{days} days"]
    )
    conn.close()
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def forecast_prophet(
    location_id: int,
    parameter_id: int,
    hours: int = 72,
) -> tuple[str, list[dict]]:
    """Multi-step forecast with uncertainty using Prophet.

    Args:
        location_id: Monitoring location ID.
        parameter_id: Environmental parameter ID.
        hours: Number of hours to forecast ahead.

    Returns:
        Tuple of (model_name, list of forecast point dicts).

    Raises:
        ValueError: If insufficient data for any forecasting method.
    """
    df = get_historical_readings(location_id, parameter_id)

    if len(df) < 24:
        return forecast_arima(location_id, parameter_id, hours)

    model = Prophet(
        interval_width=0.95,
        daily_seasonality=True,
        weekly_seasonality=True,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=hours, freq="h")
    forecast = model.predict(future)

    # Return only the future predictions
    future_only = forecast[forecast["ds"] > df["ds"].max()]
    points = [
        {
            "timestamp": row["ds"].isoformat(),
            "predicted_value": round(float(row["yhat"]), 2),
            "lower_bound": round(float(row["yhat_lower"]), 2),
            "upper_bound": round(float(row["yhat_upper"]), 2),
        }
        for _, row in future_only.iterrows()
    ]
    return ("prophet", points)


def forecast_arima(
    location_id: int,
    parameter_id: int,
    hours: int = 72,
) -> tuple[str, list[dict]]:
    """Fallback: ARIMA forecast when insufficient data for Prophet.

    Args:
        location_id: Monitoring location ID.
        parameter_id: Environmental parameter ID.
        hours: Number of hours to forecast ahead.

    Returns:
        Tuple of (model_name, list of forecast point dicts).

    Raises:
        ValueError: If fewer than 10 data points available.
    """
    df = get_historical_readings(location_id, parameter_id)

    if len(df) < 10:
        raise ValueError(
            f"Insufficient data for forecasting: only {len(df)} points "
            f"(need at least 10)"
        )

    model = ARIMA(df["y"].values, order=(2, 1, 2))
    fitted = model.fit()
    pred = fitted.get_forecast(steps=hours)
    mean = pred.predicted_mean
    ci = pred.conf_int(alpha=0.05)

    base_time = df["ds"].max()
    points = [
        {
            "timestamp": (base_time + timedelta(hours=i + 1)).isoformat(),
            "predicted_value": round(float(mean[i]), 2),
            "lower_bound": round(float(ci[i, 0]), 2),
            "upper_bound": round(float(ci[i, 1]), 2),
        }
        for i in range(hours)
    ]
    return ("arima", points)
