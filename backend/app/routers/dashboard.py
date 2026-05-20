from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import schemas
from ..database import get_db
from ..services.dashboard import build_dashboard_payload

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Returns the latest aggregate data for the frontend dashboard.
    (This is preserved for initial load and fallback).
    """
    return build_dashboard_payload(db)
