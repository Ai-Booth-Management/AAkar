from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.services.summary_service import generate_district_summary

router = APIRouter()

@router.get("/ai-summary")
def get_ai_district_summary(current_user: User = Depends(get_current_user)):
    """Retrieve or generate AI District Summary."""
    if current_user.role not in ["cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CM and DM roles are authorized to access the AI summary."
        )
    return generate_district_summary()
