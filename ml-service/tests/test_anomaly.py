"""Tests for the anomaly detection endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.anyio
async def test_anomaly_detect_minimum_readings() -> None:
    """Should reject fewer than 5 readings."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ml/anomaly/detect",
            json={
                "readings": [
                    {"value": 10.0, "timestamp": "2026-01-01T00:00:00"},
                    {"value": 12.0, "timestamp": "2026-01-01T01:00:00"},
                ],
                "method": "isolation_forest",
            },
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_anomaly_detect_isolation_forest() -> None:
    """Should detect anomalies in a batch with an obvious outlier."""
    readings = [
        {"value": float(v), "timestamp": f"2026-01-01T{i:02d}:00:00"}
        for i, v in enumerate([10, 11, 10.5, 11.2, 10.8, 11, 10.7, 100, 10.9, 11.1])
    ]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ml/anomaly/detect",
            json={"readings": readings, "method": "isolation_forest"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "isolation_forest"
    assert data["anomaly_count"] >= 1
    # The value 100 (index 7) should be flagged
    outlier = data["results"][7]
    assert outlier["is_anomaly"] is True


@pytest.mark.anyio
async def test_anomaly_detect_zscore() -> None:
    """Z-score method should also detect obvious outlier."""
    readings = [
        {"value": float(v), "timestamp": f"2026-01-01T{i:02d}:00:00"}
        for i, v in enumerate([10, 11, 10.5, 11.2, 10.8, 11, 10.7, 100, 10.9, 11.1])
    ]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ml/anomaly/detect",
            json={"readings": readings, "method": "zscore"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "zscore"
    assert data["anomaly_count"] >= 1
