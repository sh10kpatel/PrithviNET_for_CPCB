"""Anomaly detection router — POST /ml/anomaly/detect."""

from fastapi import APIRouter, HTTPException

from app.models.anomaly_detector import detect_isolation_forest, detect_zscore
from app.schemas import AnomalyDetectRequest, AnomalyResponse

router = APIRouter()


@router.post("/anomaly/detect", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyDetectRequest) -> AnomalyResponse:
    """Detect anomalies in a batch of sensor readings.

    Supports two methods:
    - isolation_forest (default): sklearn Isolation Forest, good for multimodal data
    - zscore: Simple statistical threshold, lightweight fallback
    """
    values = [r.value for r in request.readings]

    if len(values) < 5:
        raise HTTPException(
            status_code=422,
            detail="At least 5 readings required for anomaly detection",
        )

    try:
        if request.method == "zscore":
            results = detect_zscore(values)
        else:
            results = detect_isolation_forest(values)

        anomaly_count = sum(1 for r in results if r["is_anomaly"])

        return AnomalyResponse(
            method=request.method,
            results=results,
            anomaly_count=anomaly_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Anomaly detection failed: {e}"
        )
