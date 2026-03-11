"""
Forecasting service using Facebook Prophet.
Generates 24-72 hour multi-step forecasts with confidence intervals.
"""

import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.models.timeseries import TimeSeriesData
from app.schemas.timeseries import ForecastResponse, ForecastPoint

logger = logging.getLogger(__name__)


def generate_forecast(
    db: Session,
    station_id: str,
    parameter: str = "aqi_pm25",
    hours: int = 72,
) -> ForecastResponse:
    """
    Generate multi-step forecast for a station parameter using Prophet.
    Falls back to simple trend extrapolation if Prophet fails.
    """
    # Fetch last 30 days of data
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=30)

    col = getattr(TimeSeriesData, parameter, None)
    if col is None:
        return ForecastResponse(
            station_id=station_id, parameter=parameter, hours=hours, forecast=[]
        )

    rows = (
        db.query(TimeSeriesData.timestamp, col)
        .filter(
            TimeSeriesData.station_id == station_id,
            TimeSeriesData.timestamp >= start_time,
            TimeSeriesData.timestamp <= end_time,
            col.isnot(None),
        )
        .order_by(TimeSeriesData.timestamp)
        .all()
    )

    if len(rows) < 48:  # Need at least 2 days of data
        return ForecastResponse(
            station_id=station_id, parameter=parameter, hours=hours, forecast=[]
        )

    # Build dataframe
    df = pd.DataFrame(rows, columns=["ds", "y"])
    df["ds"] = pd.to_datetime(df["ds"], utc=True).dt.tz_localize(None)
    df = df.dropna(subset=["y"])

    try:
        from prophet import Prophet

        model = Prophet(
            changepoint_prior_scale=0.05,
            seasonality_mode="multiplicative",
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=hours, freq="h")
        prediction = model.predict(future)

        # Take only the forecast period
        forecast_df = prediction.tail(hours)

        forecast_points = []
        for _, row in forecast_df.iterrows():
            forecast_points.append(
                ForecastPoint(
                    timestamp=row["ds"].replace(tzinfo=timezone.utc),
                    predicted=round(max(0, row["yhat"]), 2),
                    lower_bound=round(max(0, row["yhat_lower"]), 2),
                    upper_bound=round(max(0, row["yhat_upper"]), 2),
                )
            )

        return ForecastResponse(
            station_id=station_id,
            parameter=parameter,
            hours=hours,
            forecast=forecast_points,
        )

    except Exception as e:
        logger.warning(f"Prophet failed for {station_id}/{parameter}: {e}. Using fallback.")
        return _fallback_forecast(df, station_id, parameter, hours)


def _fallback_forecast(
    df: pd.DataFrame,
    station_id: str,
    parameter: str,
    hours: int,
) -> ForecastResponse:
    """Simple fallback: use last 24h moving average + diurnal pattern."""
    recent = df.tail(168)  # Last 7 days
    if len(recent) < 24:
        return ForecastResponse(
            station_id=station_id, parameter=parameter, hours=hours, forecast=[]
        )

    # Compute hourly averages (diurnal pattern)
    recent["hour"] = pd.to_datetime(recent["ds"]).dt.hour
    hourly_avg = recent.groupby("hour")["y"].mean().to_dict()
    overall_mean = recent["y"].mean()
    overall_std = recent["y"].std()

    last_ts = recent["ds"].iloc[-1]
    forecast_points = []

    for h in range(1, hours + 1):
        ts = last_ts + timedelta(hours=h)
        hour_of_day = ts.hour
        predicted = hourly_avg.get(hour_of_day, overall_mean)
        noise = np.random.normal(0, overall_std * 0.1)
        predicted = max(0, predicted + noise)

        forecast_points.append(
            ForecastPoint(
                timestamp=ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts,
                predicted=round(predicted, 2),
                lower_bound=round(max(0, predicted - 1.96 * overall_std), 2),
                upper_bound=round(predicted + 1.96 * overall_std, 2),
            )
        )

    return ForecastResponse(
        station_id=station_id,
        parameter=parameter,
        hours=hours,
        forecast=forecast_points,
    )
