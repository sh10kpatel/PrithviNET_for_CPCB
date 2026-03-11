# ML Service — PrithviNET

> Priority: **P1** — build after the Express API is functional with seed data.

## Tech Stack

- Python 3.11+
- FastAPI + Uvicorn
- Prophet (forecasting) with statsmodels ARIMA fallback
- scikit-learn (Isolation Forest for anomaly detection)
- Google Gemini API (compliance copilot)
- Pydantic v2 for request/response models
- Ruff for linting and formatting

## Project Structure

```
ml-service/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Settings from env vars
│   ├── routers/
│   │   ├── forecast.py      # GET /ml/forecast
│   │   ├── anomaly.py       # POST /ml/anomaly/detect
│   │   └── copilot.py       # POST /ml/copilot/query
│   ├── models/
│   │   ├── forecaster.py    # Prophet/ARIMA wrapper
│   │   ├── anomaly_detector.py  # Isolation Forest + Z-score
│   │   └── copilot_engine.py    # Gemini context builder
│   ├── schemas.py           # Pydantic request/response models
│   └── data/                # Cached model artifacts (.pkl)
├── tests/
│   ├── test_forecast.py
│   ├── test_anomaly.py
│   └── test_copilot.py
├── requirements.txt
└── .env
```

## FastAPI App Setup

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import forecast, anomaly, copilot

app = FastAPI(title="PrithviNET ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],  # Express only
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/ml")
app.include_router(anomaly.router, prefix="/ml")
app.include_router(copilot.router, prefix="/ml")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

## Pydantic Schemas

```python
# app/schemas.py
from pydantic import BaseModel, Field


class ForecastRequest(BaseModel):
    location_id: int
    parameter_id: int
    hours: int = Field(default=72, ge=1, le=168)  # max 7 days


class ForecastPoint(BaseModel):
    timestamp: str
    predicted_value: float
    lower_bound: float  # 95% CI
    upper_bound: float


class ForecastResponse(BaseModel):
    location_id: int
    parameter_id: int
    horizon_hours: int
    model: str  # "prophet" or "arima"
    points: list[ForecastPoint]


class ReadingInput(BaseModel):
    value: float
    timestamp: str


class AnomalyDetectRequest(BaseModel):
    readings: list[ReadingInput]
    method: str = "isolation_forest"  # or "zscore"


class AnomalyResult(BaseModel):
    index: int
    value: float
    anomaly_score: float  # 0.0 = normal, 1.0 = extreme
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    method: str
    results: list[AnomalyResult]
    anomaly_count: int


class CopilotRequest(BaseModel):
    question: str = Field(min_length=5, max_length=1000)
    context: dict  # injected by Express: industries, readings, limits, etc.


class CopilotResponse(BaseModel):
    answer: str
    confidence: float
    citations: list[str]
```

## Forecasting — Prophet + ARIMA Fallback

```python
# app/models/forecaster.py
import sqlite3
from datetime import datetime, timedelta

import pandas as pd
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA

from app.config import settings


def get_historical_readings(location_id: int, parameter_id: int, days: int = 30) -> pd.DataFrame:
    """Fetch historical readings from SQLite for model training."""
    conn = sqlite3.connect(settings.DB_PATH)
    query = """
        SELECT timestamp AS ds, value AS y
        FROM readings
        WHERE location_id = ? AND parameter_id = ?
          AND timestamp >= datetime('now', ?)
        ORDER BY timestamp ASC
    """
    df = pd.read_sql_query(query, conn, params=(location_id, parameter_id, f"-{days} days"))
    conn.close()
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def forecast_prophet(
    location_id: int,
    parameter_id: int,
    hours: int = 72,
) -> list[dict]:
    """Multi-step forecast with uncertainty using Prophet."""
    df = get_historical_readings(location_id, parameter_id)
    if len(df) < 24:
        return forecast_arima(location_id, parameter_id, hours)  # fallback

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
    return [
        {
            "timestamp": row["ds"].isoformat(),
            "predicted_value": round(row["yhat"], 2),
            "lower_bound": round(row["yhat_lower"], 2),
            "upper_bound": round(row["yhat_upper"], 2),
        }
        for _, row in future_only.iterrows()
    ]


def forecast_arima(
    location_id: int,
    parameter_id: int,
    hours: int = 72,
) -> list[dict]:
    """Fallback: ARIMA forecast when insufficient data for Prophet."""
    df = get_historical_readings(location_id, parameter_id)
    if len(df) < 10:
        raise ValueError("Insufficient data for forecasting")

    model = ARIMA(df["y"].values, order=(2, 1, 2))
    fitted = model.fit()
    pred = fitted.get_forecast(steps=hours)
    mean = pred.predicted_mean
    ci = pred.conf_int(alpha=0.05)

    base_time = df["ds"].max()
    return [
        {
            "timestamp": (base_time + timedelta(hours=i + 1)).isoformat(),
            "predicted_value": round(float(mean[i]), 2),
            "lower_bound": round(float(ci[i, 0]), 2),
            "upper_bound": round(float(ci[i, 1]), 2),
        }
        for i in range(hours)
    ]
```

## Anomaly Detection — Isolation Forest + Z-Score

```python
# app/models/anomaly_detector.py
import numpy as np
from sklearn.ensemble import IsolationForest


def detect_isolation_forest(
    values: list[float],
    contamination: float = 0.05,
) -> list[dict]:
    """Isolation Forest anomaly detection on a readings array."""
    arr = np.array(values).reshape(-1, 1)
    model = IsolationForest(contamination=contamination, random_state=42)
    model.fit(arr)

    scores = model.decision_function(arr)
    labels = model.predict(arr)  # 1 = normal, -1 = anomaly

    # Normalize scores to 0-1 (higher = more anomalous)
    norm_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)

    return [
        {
            "index": i,
            "value": float(values[i]),
            "anomaly_score": round(float(norm_scores[i]), 4),
            "is_anomaly": bool(labels[i] == -1),
        }
        for i in range(len(values))
    ]


def detect_zscore(values: list[float], threshold: float = 3.0) -> list[dict]:
    """Z-score based anomaly detection (lightweight fallback)."""
    arr = np.array(values)
    mean, std = arr.mean(), arr.std()
    if std == 0:
        return [{"index": i, "value": float(v), "anomaly_score": 0.0, "is_anomaly": False} for i, v in enumerate(values)]

    z_scores = np.abs((arr - mean) / std)
    norm_scores = np.clip(z_scores / (threshold * 1.5), 0.0, 1.0)

    return [
        {
            "index": i,
            "value": float(values[i]),
            "anomaly_score": round(float(norm_scores[i]), 4),
            "is_anomaly": bool(z_scores[i] > threshold),
        }
        for i in range(len(values))
    ]
```

## Compliance Copilot — Gemini Integration

```python
# app/models/copilot_engine.py
import google.generativeai as genai

from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are PrithviNET Compliance Copilot, an AI assistant for environmental
monitoring and compliance in India. You help Regional Officers and administrators understand
pollution data, predict risks, and evaluate what-if scenarios.

You have access to the following context about the current environmental situation:
- Industry details, emission records, and compliance history
- Prescribed limits per CPCB/SPCB standards (NAAQS for air, IS:2296 for water, noise rules)
- Recent sensor readings and anomaly flags
- Regional risk assessments

When answering:
1. Be specific — cite actual values, thresholds, and percentages
2. For what-if queries, explain your reasoning step by step
3. Flag any assumptions you make
4. Recommend concrete actions when appropriate
5. Use Indian regulatory context (CPCB, SPCB, Environment Protection Act 1986)
"""


async def query_copilot(question: str, context: dict) -> dict:
    """Send a contextual query to Gemini and return structured response."""
    model = genai.GenerativeModel("gemini-1.5-flash")

    context_str = format_context(context)
    prompt = f"{SYSTEM_PROMPT}\n\n--- CONTEXT ---\n{context_str}\n\n--- QUESTION ---\n{question}"

    response = await model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1024,
        ),
    )

    return {
        "answer": response.text,
        "confidence": 0.85,  # placeholder; could derive from model metadata
        "citations": extract_citations(context),
    }


def format_context(context: dict) -> str:
    """Convert structured context dict to readable text for the LLM."""
    parts = []
    if "industry" in context:
        ind = context["industry"]
        parts.append(f"Industry: {ind['name']} ({ind['type']}), Status: {ind['status']}")
    if "recent_readings" in context:
        for r in context["recent_readings"][:20]:
            parts.append(f"  {r['parameter']}: {r['value']} {r['unit']} at {r['timestamp']}")
    if "limits" in context:
        for l in context["limits"]:
            parts.append(f"  Limit for {l['parameter']}: max {l['max_value']} {l['unit']}")
    if "alerts" in context:
        parts.append(f"Active alerts: {len(context['alerts'])}")
    return "\n".join(parts)


def extract_citations(context: dict) -> list[str]:
    """Pull data sources referenced in the context."""
    citations = []
    if "industry" in context:
        citations.append(f"Industry: {context['industry']['name']}")
    if "recent_readings" in context:
        citations.append(f"Readings: {len(context['recent_readings'])} recent observations")
    return citations
```

## Router Wiring

```python
# app/routers/forecast.py
from fastapi import APIRouter, HTTPException, Query
from app.models.forecaster import forecast_prophet
from app.schemas import ForecastResponse

router = APIRouter()

@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    location_id: int = Query(...),
    parameter_id: int = Query(...),
    hours: int = Query(default=72, ge=1, le=168),
) -> ForecastResponse:
    """Generate multi-step forecast with uncertainty estimates."""
    try:
        points = forecast_prophet(location_id, parameter_id, hours)
        return ForecastResponse(
            location_id=location_id,
            parameter_id=parameter_id,
            horizon_hours=hours,
            model="prophet",
            points=points,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")
```

## requirements.txt

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
prophet>=1.1.5
statsmodels>=0.14.0
scikit-learn>=1.4.0
pandas>=2.1.0
numpy>=1.26.0
google-generativeai>=0.3.0
python-dotenv>=1.0.0
ruff>=0.2.0
pytest>=7.4.0
httpx>=0.26.0
```

## Implementation Priority

| Priority | Component | Notes |
|---|---|---|
| P0 | FastAPI skeleton + /health endpoint | Verify service starts |
| P1 | Forecast endpoint with Prophet | Core innovation feature |
| P1 | Anomaly detection endpoint | Feeds into alert system |
| P1 | Copilot endpoint with Gemini | High demo impact |
| P2 | ARIMA fallback for sparse data | Robustness |
| P2 | Model caching (.pkl artifacts) | Performance optimization |
