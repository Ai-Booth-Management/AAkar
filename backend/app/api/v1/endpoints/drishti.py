from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List

from app.domain.models.project import Project, ProjectJustification
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User

router = APIRouter()


class ActionRequest(BaseModel):
    action: str
    justification: str


class ProjectJustificationRead(BaseModel):
    id: int
    project_id: int
    action: str
    user: str
    text: str
    timestamp: str

    class Config:
        from_attributes = True


class ProjectRead(BaseModel):
    id: int
    name: str
    department: str
    budget: str
    allocated: int
    released: int
    utilized: int
    remaining: int
    deadline: str
    progress: int
    officer: str
    status: str
    justifications: List[ProjectJustificationRead] = []

    class Config:
        from_attributes = True


@router.get("/projects", response_model=List[ProjectRead])
def list_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all projects for monitoring."""
    # Ensure user is authorized
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access project data."
        )
    
    statement = select(Project)
    results = session.exec(statement).all()
    return results


@router.post("/projects/{project_id}/action", response_model=ProjectRead)
def perform_project_action(
    project_id: int,
    body: ActionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Register an action taken on a project by the DM."""
    # DM is the only role authorized to perform actions on Drishti
    if current_user.role != "dm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only District Magistrates are authorized to execute project actions."
        )

    if not body.justification.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification is mandatory before taking action."
        )

    if len(body.justification.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification must be at least 10 characters long."
        )

    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    # Calculate status and progress changes
    new_status = project.status
    new_progress = project.progress

    action_type = body.action
    if action_type == "Approve":
        new_status = "Approved"
        new_progress = 100
    elif action_type == "Reject":
        new_status = "Rejected"
    elif action_type == "Escalate":
        new_status = "Escalated"
    elif action_type == "Request Inspection":
        new_status = "Inspection Requested"
    elif action_type == "Mark Delayed":
        new_status = "Delayed"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action type: {action_type}"
        )

    # Update project fields
    project.status = new_status
    project.progress = new_progress
    session.add(project)

    # Save justification log
    import datetime
    timestamp = datetime.datetime.now().strftime("%I:%M %p")
    
    just = ProjectJustification(
        project_id=project.id,
        action=action_type,
        user=current_user.display_name or current_user.email.split("@")[0].upper(),
        text=body.justification.strip(),
        timestamp=timestamp
    )
    session.add(just)
    session.commit()
    
    # Refresh to load relationships
    session.refresh(project)
    return project
