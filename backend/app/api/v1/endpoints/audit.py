from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional

from app.domain.models.audit_log import AuditLog
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User

router = APIRouter()


class AuditLogRead(BaseModel):
    id: int
    action_type: str
    project_name: Optional[str]
    department: Optional[str]
    officer: Optional[str]
    details: str
    timestamp: str

    class Config:
        from_attributes = True


@router.get("/logs", response_model=List[AuditLogRead])
def list_audit_logs(
    officer: Optional[str] = None,
    project: Optional[str] = None,
    department: Optional[str] = None,
    date: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve filtered audit and decision trail logs."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access audit logs."
        )

    statement = select(AuditLog)

    if officer:
        statement = statement.where(AuditLog.officer.like(f"%{officer}%"))
    if project:
        statement = statement.where(AuditLog.project_name.like(f"%{project}%"))
    if department:
        statement = statement.where(AuditLog.department.like(f"%{department}%"))
    if date:
        statement = statement.where(AuditLog.timestamp.like(f"{date}%"))

    # Order by newest first
    statement = statement.order_by(AuditLog.id.desc())

    results = session.exec(statement).all()
    return results
