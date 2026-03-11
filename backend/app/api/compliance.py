"""
Compliance simulation endpoint – delegates to the compliance service.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.compliance import ComplianceQuery, ComplianceResponse

router = APIRouter()


@router.post("/simulate", response_model=ComplianceResponse)
def simulate_scenario(
    query: ComplianceQuery,
    db: Session = Depends(get_db),
):
    """
    Run an AI-powered compliance simulation.

    Delegates to ``app.services.compliance.run_simulation``.
    If the service module is not yet implemented a stub response is returned.
    """

    try:
        from app.services.compliance import run_simulation

        result = run_simulation(db, query)
        return result
    except ImportError:
        # Service not implemented yet – return a stub response
        return ComplianceResponse(
            analysis=(
                "Compliance simulation service is not yet implemented. "
                f"Query received: '{query.query}'"
            ),
            predicted_impact=None,
            recommendations=[
                "Implement the compliance service in app/services/compliance.py"
            ],
            affected_stations=[query.station_id] if query.station_id else [],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Compliance simulation failed: {exc}")
