from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.domain.models.file_tracker import FileTracker, FileTimelineEntry
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User

router = APIRouter()


class FileCreate(BaseModel):
    title: str
    department: str
    current_holder: str
    days_pending: int = 0


class FileAction(BaseModel):
    action: str  # Approve, Reject, Forward, Escalate
    rejection_reason: Optional[str] = None
    forward_to: Optional[str] = None


class FileTimelineEntryRead(BaseModel):
    id: int
    file_tracker_id: int
    stage: str
    timestamp: str
    actor: str
    details: Optional[str] = None

    class Config:
        from_attributes = True


class FileTrackerRead(BaseModel):
    id: int
    title: str
    department: str
    current_holder: str
    status: str
    days_pending: int
    rejection_reason: Optional[str] = None
    timeline: List[FileTimelineEntryRead] = []

    class Config:
        from_attributes = True


@router.get("", response_model=List[FileTrackerRead])
def list_files(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all files under tracking."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access file tracking."
        )
    statement = select(FileTracker)
    return session.exec(statement).all()


@router.post("", response_model=FileTrackerRead, status_code=status.HTTP_201_CREATED)
def create_file(
    body: FileCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new file tracking record."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track files."
        )

    db_file = FileTracker(
        title=body.title,
        department=body.department,
        current_holder=body.current_holder,
        status="Pending",
        days_pending=body.days_pending
    )
    session.add(db_file)
    session.commit()
    session.refresh(db_file)

    # Log timeline creation entry
    actor_name = current_user.display_name or current_user.email
    entry = FileTimelineEntry(
        file_tracker_id=db_file.id,
        stage="Created",
        timestamp=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        actor=actor_name,
        details="File tracking initialized."
    )
    session.add(entry)
    session.commit()
    session.refresh(db_file)

    return db_file


@router.post("/{file_id}/action", response_model=FileTrackerRead)
def perform_file_action(
    file_id: int,
    body: FileAction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Perform action on file and update timeline logs."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform actions on files."
        )

    db_file = session.get(FileTracker, file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File tracker not found."
        )

    actor_name = current_user.display_name or current_user.email
    timestamp_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")

    if body.action == "Approve":
        db_file.status = "Approved"
        details_text = "File approved."
        entry = FileTimelineEntry(
            file_tracker_id=db_file.id,
            stage="Approved",
            timestamp=timestamp_str,
            actor=actor_name,
            details=details_text
        )
        session.add(entry)
    
    elif body.action == "Reject":
        if not body.rejection_reason or not body.rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is mandatory."
            )
        db_file.status = "Rejected"
        db_file.rejection_reason = body.rejection_reason.strip()
        details_text = f"Rejected: {body.rejection_reason.strip()}"
        entry = FileTimelineEntry(
            file_tracker_id=db_file.id,
            stage="Rejected",
            timestamp=timestamp_str,
            actor=actor_name,
            details=details_text
        )
        session.add(entry)

    elif body.action == "Forward":
        if not body.forward_to or not body.forward_to.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forward recipient (forward_to) is required."
            )
        db_file.status = "Forwarded"
        old_holder = db_file.current_holder
        db_file.current_holder = body.forward_to.strip()
        details_text = f"Forwarded from {old_holder} to {body.forward_to.strip()}."
        
        # Log reviewed first, then forwarded, to match timeline checklist stages
        rev_entry = FileTimelineEntry(
            file_tracker_id=db_file.id,
            stage="Reviewed",
            timestamp=timestamp_str,
            actor=actor_name,
            details="Reviewed and cleared for forwarding."
        )
        fwd_entry = FileTimelineEntry(
            file_tracker_id=db_file.id,
            stage="Forwarded",
            timestamp=timestamp_str,
            actor=actor_name,
            details=details_text
        )
        session.add(rev_entry)
        session.add(fwd_entry)

    elif body.action == "Escalate":
        db_file.status = "Escalated"
        old_holder = db_file.current_holder
        db_file.current_holder = "District Magistrate (DM)"
        details_text = f"Escalated from {old_holder} to District Magistrate (DM)."
        entry = FileTimelineEntry(
            file_tracker_id=db_file.id,
            stage="Escalated",
            timestamp=timestamp_str,
            actor=actor_name,
            details=details_text
        )
        session.add(entry)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action type. Must be Approve, Reject, Forward, or Escalate."
        )

    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    return db_file
