"""
Alerts endpoints – list, stats, and status updates.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertBase, AlertUpdate, AlertsResponse

router = APIRouter()


@router.get("/", response_model=AlertsResponse)
def list_alerts(
    station_id: str | None = Query(None),
    category: str | None = Query(None, description="AIR | WATER | NOISE"),
    severity: str | None = Query(None, description="Warning | Critical | Hazardous"),
    status: str | None = Query(None, description="Active | Acknowledged | Resolved"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List alerts with optional filters and pagination."""

    query = db.query(Alert)

    if station_id:
        query = query.filter(Alert.station_id == station_id)
    if category:
        query = query.filter(Alert.category == category)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)

    total = query.count()

    alerts = (
        query.order_by(desc(Alert.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Compute global counts (unfiltered by status so the caller knows full picture)
    base_query = db.query(Alert)
    if station_id:
        base_query = base_query.filter(Alert.station_id == station_id)
    if category:
        base_query = base_query.filter(Alert.category == category)
    if severity:
        base_query = base_query.filter(Alert.severity == severity)

    active_count = base_query.filter(Alert.status == "Active").count()
    acknowledged_count = base_query.filter(Alert.status == "Acknowledged").count()
    resolved_count = base_query.filter(Alert.status == "Resolved").count()

    return AlertsResponse(
        alerts=[
            AlertBase(
                alert_id=a.alert_id,
                station_id=a.station_id,
                timestamp=a.timestamp,
                parameter=a.parameter,
                value=a.value,
                threshold=a.threshold,
                severity=a.severity,
                category=a.category,
                status=a.status,
            )
            for a in alerts
        ],
        total=total,
        active_count=active_count,
        acknowledged_count=acknowledged_count,
        resolved_count=resolved_count,
    )


@router.get("/stats")
def alert_stats(
    station_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return alert counts grouped by status, category, and severity."""

    base = db.query(Alert)
    if station_id:
        base = base.filter(Alert.station_id == station_id)

    # By status
    status_rows = (
        base.with_entities(Alert.status, func.count(Alert.alert_id))
        .group_by(Alert.status)
        .all()
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # By category
    category_rows = (
        base.with_entities(Alert.category, func.count(Alert.alert_id))
        .group_by(Alert.category)
        .all()
    )
    by_category = {row[0]: row[1] for row in category_rows}

    # By severity
    severity_rows = (
        base.with_entities(Alert.severity, func.count(Alert.alert_id))
        .group_by(Alert.severity)
        .all()
    )
    by_severity = {row[0]: row[1] for row in severity_rows}

    return {
        "total": sum(by_status.values()),
        "by_status": by_status,
        "by_category": by_category,
        "by_severity": by_severity,
    }


@router.patch("/{alert_id}", response_model=AlertBase)
def update_alert(
    alert_id: int,
    body: AlertUpdate,
    db: Session = Depends(get_db),
):
    """Update an alert's status (Acknowledged or Resolved)."""

    if body.status not in ("Acknowledged", "Resolved"):
        raise HTTPException(
            status_code=400,
            detail="Status must be 'Acknowledged' or 'Resolved'",
        )

    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = body.status

    if body.status == "Resolved":
        alert.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(alert)

    return AlertBase(
        alert_id=alert.alert_id,
        station_id=alert.station_id,
        timestamp=alert.timestamp,
        parameter=alert.parameter,
        value=alert.value,
        threshold=alert.threshold,
        severity=alert.severity,
        category=alert.category,
        status=alert.status,
    )
