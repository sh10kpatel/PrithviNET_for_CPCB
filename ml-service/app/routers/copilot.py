"""Compliance copilot router — POST /ml/copilot/query."""

from fastapi import APIRouter, HTTPException

from app.models.copilot_engine import query_copilot
from app.schemas import CopilotRequest, CopilotResponse

router = APIRouter()


@router.post("/copilot/query", response_model=CopilotResponse)
async def copilot_query(request: CopilotRequest) -> CopilotResponse:
    """Ask the AI compliance copilot a question with environmental context.

    The Express backend injects structured context (industry data, readings,
    prescribed limits, alert history) before forwarding to this endpoint.
    """
    try:
        result = await query_copilot(request.question, request.context)
        return CopilotResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Copilot query failed: {e}"
        )
