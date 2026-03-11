"""
Anomaly detection endpoint – delegates to the anomaly service.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.station import MonitoringStation

router = APIRouter()


@router.get("/{station_id}")
def get_anomalies(
    station_id: str,
    lookback_hours: int = Query(168, ge=1, le=720, description="Look-back window in hours (default 7 days)"),
    db: Session = Depends(get_db),
):
    """
    Detect anomalies in recent readings for the given station.

    Delegates to ``app.services.anomaly.detect_anomalies``.
    If the service module is not yet implemented a stub response is returned.
    """

    # Validate station
    station = (
        db.query(MonitoringStation)
        .filter(MonitoringStation.station_id == station_id)
        .first()
    )
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    try:
        from app.services.anomaly import detect_anomalies

        result = detect_anomalies(db, station_id, lookback_hours)
        return result
    except ImportError:
        # Service not implemented yet – return empty result
        return {
            "station_id": station_id,
            "lookback_hours": lookback_hours,
            "anomalies": [],
            "message": "Anomaly detection service not yet implemented",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {exc}")
