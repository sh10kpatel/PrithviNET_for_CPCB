"""
Report generation endpoint – generates PDF / PPTX reports.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.compliance import ReportRequest

router = APIRouter()


@router.post("/generate")
def generate_report(
    body: ReportRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a downloadable PDF or PPTX report.

    Delegates to ``app.services.reports.build_report``.
    If the service module is not yet implemented a stub JSON response is returned.
    """

    if body.format not in ("pdf", "pptx"):
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'pptx'")

    if not body.station_ids:
        raise HTTPException(status_code=400, detail="At least one station_id is required")

    try:
        from app.services.reports import build_report

        file_path = build_report(
            db=db,
            station_ids=body.station_ids,
            start_date=body.start_date,
            end_date=body.end_date,
            fmt=body.format,
            sections=body.sections,
        )

        # Return the file as a download
        from fastapi.responses import FileResponse

        media_type = (
            "application/pdf"
            if body.format == "pdf"
            else "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=f"prithvinet_report.{body.format}",
        )
    except ImportError:
        # Service not implemented yet – return stub
        return JSONResponse(
            status_code=200,
            content={
                "status": "pending",
                "message": "Report generation service is not yet implemented",
                "request": {
                    "station_ids": body.station_ids,
                    "start_date": body.start_date,
                    "end_date": body.end_date,
                    "format": body.format,
                    "sections": body.sections,
                },
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")
