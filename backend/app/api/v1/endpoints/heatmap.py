from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from app.domain.models.district_metric import DistrictMetric
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User

router = APIRouter()


@router.get("/metrics", response_model=List[DistrictMetric])
def list_district_metrics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all district metrics for heatmaps."""
    # Authenticated official role required
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access district metrics."
        )
    
    statement = select(DistrictMetric)
    results = session.exec(statement).all()
    return results
