"""Tests for the copilot endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.anyio
async def test_copilot_missing_fields() -> None:
    """Copilot without question should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ml/copilot/query",
            json={"context": {}},
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_copilot_question_too_short() -> None:
    """Copilot with question < 5 chars should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ml/copilot/query",
            json={"question": "Hi", "context": {}},
        )
    assert response.status_code == 422
